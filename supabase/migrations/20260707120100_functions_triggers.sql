-- The Dish Archive — security helper functions + triggers
-- These SECURITY DEFINER helpers are owned by the migration role and therefore
-- bypass RLS internally, so calling them from RLS policies never recurses.

-- =====================================================================
-- Authorization predicates (used by RLS in the next migration)
-- =====================================================================
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and global_role = 'super_admin'
    );
$$;

create or replace function public.is_family_member(target_family uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.family_members
        where family_id = target_family
          and user_id = auth.uid()
          and status = 'approved'
    );
$$;

create or replace function public.family_role(target_family uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
    select role from public.family_members
    where family_id = target_family
      and user_id = auth.uid()
      and status = 'approved'
    limit 1;
$$;

-- owner/admin/editor may create & edit recipes in the family
create or replace function public.can_edit_family(target_family uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.is_super_admin()
        or exists (
            select 1 from public.family_members
            where family_id = target_family
              and user_id = auth.uid()
              and status = 'approved'
              and role in ('owner', 'admin', 'editor')
        );
$$;

-- owner/admin may manage members and family settings
create or replace function public.can_admin_family(target_family uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.is_super_admin()
        or exists (
            select 1 from public.family_members
            where family_id = target_family
              and user_id = auth.uid()
              and status = 'approved'
              and role in ('owner', 'admin')
        );
$$;

-- Dish-scoped predicates for child tables (images/ingredients/steps/ratings)
create or replace function public.can_view_dish(target_dish text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.dishes d
        where d.id = target_dish
          and (
              public.is_super_admin()
              or public.can_edit_family(d.family_id)
              or (d.status = 'published' and public.is_family_member(d.family_id))
              or (d.status = 'published' and d.visibility = 'public')
          )
    );
$$;

create or replace function public.can_edit_dish(target_dish text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.dishes d
        where d.id = target_dish
          and public.can_edit_family(d.family_id)
    );
$$;

-- =====================================================================
-- Generic updated_at maintenance
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    -- Skip audit bump for system-only dish rating-aggregate recomputes.
    if current_setting('app.skip_dish_guard', true) = 'on' then
        return new;
    end if;
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_profiles_updated       before update on public.profiles       for each row execute function public.set_updated_at();
create trigger trg_families_updated       before update on public.families       for each row execute function public.set_updated_at();
create trigger trg_family_members_updated before update on public.family_members for each row execute function public.set_updated_at();
create trigger trg_dishes_updated         before update on public.dishes         for each row execute function public.set_updated_at();
create trigger trg_recipe_ratings_updated before update on public.recipe_ratings for each row execute function public.set_updated_at();
create trigger trg_access_requests_updated before update on public.access_requests for each row execute function public.set_updated_at();

-- =====================================================================
-- New auth user -> profile. Super admin is provisioned automatically.
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_email text := lower(trim(new.email));
begin
    insert into public.profiles (id, email, display_name, avatar_url, global_role, last_login_at)
    values (
        new.id,
        v_email,
        coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
        new.raw_user_meta_data ->> 'avatar_url',
        case when v_email = 'zshkarrr@gmail.com' then 'super_admin' else 'user' end,
        now()
    )
    on conflict (id) do update
        set last_login_at = now();
    return new;
exception
    when unique_violation then
        -- Email already belongs to another profile (e.g. provider relink).
        -- Never block auth signup: just refresh that profile's login time.
        update public.profiles set last_login_at = now() where email = v_email;
        return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- =====================================================================
-- Prevent privilege escalation: only a super admin may change global_role
-- =====================================================================
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_super_admin() then
        if new.global_role is distinct from old.global_role then
            raise exception 'Only a super admin can change global_role';
        end if;
        -- Email is derived from the auth identity; users cannot rewrite it.
        new.email := old.email;
    end if;
    return new;
end;
$$;

create trigger trg_guard_profile_role
    before update on public.profiles
    for each row execute function public.guard_profile_role();

-- =====================================================================
-- Dish integrity: pin identity/tenancy/ownership columns on update and
-- restrict public exposure to family owners/admins (defense-in-depth,
-- independent of the frontend).
-- =====================================================================
create or replace function public.guard_dish_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'UPDATE' then
        -- System-only rating-aggregate recompute: skip pinning, audit stamp
        -- and the visibility gate entirely.
        if current_setting('app.skip_dish_guard', true) = 'on' then
            return new;
        end if;
        new.id := old.id;
        new.family_id := old.family_id;
        new.created_by_user_id := old.created_by_user_id;
        new.created_at := old.created_at;
        new.updated_by_user_id := auth.uid();
    end if;

    -- Only gate the moment a recipe is made public (on insert, or a
    -- visibility change to public) — not on every edit of an already-public dish.
    if new.visibility = 'public'
       and (tg_op = 'INSERT' or new.visibility is distinct from old.visibility)
       and not (public.is_super_admin() or public.can_admin_family(new.family_id)) then
        raise exception 'Only a family owner or admin can make a recipe public';
    end if;

    return new;
end;
$$;

create trigger trg_guard_dish_columns
    before insert or update on public.dishes
    for each row execute function public.guard_dish_columns();

-- =====================================================================
-- Rating aggregates: keep dishes.rating_average / rating_count in sync
-- =====================================================================
create or replace function public.recompute_dish_rating(target_dish text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Flag this as a system update so the dish guard / updated_at triggers
    -- do not treat the aggregate write as a user edit.
    perform set_config('app.skip_dish_guard', 'on', true);
    update public.dishes d
    set rating_average = coalesce((
            select round(avg(rating)::numeric, 2) from public.recipe_ratings where dish_id = target_dish
        ), 0),
        rating_count = (
            select count(*) from public.recipe_ratings where dish_id = target_dish
        )
    where d.id = target_dish;
    perform set_config('app.skip_dish_guard', 'off', true);
end;
$$;

create or replace function public.on_rating_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'DELETE' then
        perform public.recompute_dish_rating(old.dish_id);
        return old;
    end if;
    if tg_op = 'UPDATE' and new.dish_id is distinct from old.dish_id then
        perform public.recompute_dish_rating(old.dish_id);
    end if;
    perform public.recompute_dish_rating(new.dish_id);
    return new;
end;
$$;

create trigger trg_rating_change
    after insert or update or delete on public.recipe_ratings
    for each row execute function public.on_rating_change();
