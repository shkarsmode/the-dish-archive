-- The Dish Archive — Row Level Security
-- Everything is deny-by-default once RLS is enabled; policies below grant
-- the minimum each role needs. Privileged multi-step actions go through the
-- SECURITY DEFINER RPCs in the next migration, not through broad table grants.

alter table public.profiles        enable row level security;
alter table public.families        enable row level security;
alter table public.family_members  enable row level security;
alter table public.dishes          enable row level security;
alter table public.dish_images     enable row level security;
alter table public.ingredients     enable row level security;
alter table public.cooking_steps   enable row level security;
alter table public.recipe_ratings  enable row level security;
alter table public.access_requests enable row level security;
alter table public.activity_log    enable row level security;
alter table public.changelog       enable row level security;

-- =====================================================================
-- profiles
-- =====================================================================
create policy profiles_select_self_or_admin on public.profiles
    for select using (
        id = auth.uid()
        or public.is_super_admin()
        or exists (
            select 1 from public.family_members m
            where m.user_id = profiles.id
              and public.can_admin_family(m.family_id)
        )
    );

-- profile rows are created by the on_auth_user_created trigger (definer),
-- so no INSERT policy is granted to clients.

create policy profiles_update_self_or_admin on public.profiles
    for update using (id = auth.uid() or public.is_super_admin())
    with check (id = auth.uid() or public.is_super_admin());
-- global_role changes are additionally gated by guard_profile_role().

-- =====================================================================
-- families
-- =====================================================================
create policy families_select_visible on public.families
    for select using (
        public.is_super_admin()
        or is_public_visible
        or public.is_family_member(id)
    );

create policy families_insert_super_admin on public.families
    for insert with check (public.is_super_admin());

create policy families_update_admin on public.families
    for update using (public.can_admin_family(id))
    with check (public.can_admin_family(id));

create policy families_delete_super_admin on public.families
    for delete using (public.is_super_admin());

-- =====================================================================
-- family_members
-- =====================================================================
create policy family_members_select on public.family_members
    for select using (
        user_id = auth.uid()
        or public.can_admin_family(family_id)
    );

-- No client INSERT/UPDATE/DELETE policies: every membership mutation goes
-- through the audited, rank-checked SECURITY DEFINER RPCs (add_family_member,
-- set_member_role, remove_member, approve_access_request). This prevents an
-- admin from directly seating owners or bypassing the audit trail.

-- =====================================================================
-- dishes
-- =====================================================================
create policy dishes_select on public.dishes
    for select using (
        public.is_super_admin()
        or public.can_edit_family(family_id)                       -- owner/admin/editor: all statuses
        or (status = 'published' and public.is_family_member(family_id)) -- any approved member: published
        or (status = 'published' and visibility = 'public')        -- public recipes: anyone
    );

create policy dishes_insert on public.dishes
    for insert with check (
        public.can_edit_family(family_id)
        and (created_by_user_id = auth.uid() or public.is_super_admin())
    );

create policy dishes_update on public.dishes
    for update using (public.can_edit_family(family_id))
    with check (public.can_edit_family(family_id));

create policy dishes_delete on public.dishes
    for delete using (public.can_admin_family(family_id));

-- =====================================================================
-- dish children (images / ingredients / cooking_steps)
-- =====================================================================
create policy dish_images_select on public.dish_images
    for select using (public.can_view_dish(dish_id));
create policy dish_images_write on public.dish_images
    for all using (public.can_edit_dish(dish_id))
    with check (public.can_edit_dish(dish_id));

create policy ingredients_select on public.ingredients
    for select using (public.can_view_dish(dish_id));
create policy ingredients_write on public.ingredients
    for all using (public.can_edit_dish(dish_id))
    with check (public.can_edit_dish(dish_id));

create policy cooking_steps_select on public.cooking_steps
    for select using (public.can_view_dish(dish_id));
create policy cooking_steps_write on public.cooking_steps
    for all using (public.can_edit_dish(dish_id))
    with check (public.can_edit_dish(dish_id));

-- =====================================================================
-- recipe_ratings
-- =====================================================================
create policy recipe_ratings_select on public.recipe_ratings
    for select using (public.can_view_dish(dish_id) or public.is_super_admin());

-- No client INSERT/UPDATE policies: ratings are written only through the
-- rate_dish() RPC, which derives family_id from the dish and never trusts a
-- client-supplied dish_id/family_id. Deletes are authorized against the dish's
-- REAL family, not the (previously spoofable) stored family_id.
create policy recipe_ratings_delete on public.recipe_ratings
    for delete using (
        user_id = auth.uid()
        or public.is_super_admin()
        or public.can_admin_family((select family_id from public.dishes where id = dish_id))
    );

-- =====================================================================
-- access_requests
-- =====================================================================
create policy access_requests_insert_self on public.access_requests
    for insert with check (requested_by_user_id = auth.uid());

create policy access_requests_select on public.access_requests
    for select using (
        requested_by_user_id = auth.uid()
        or public.is_super_admin()
        or (family_id is not null and public.can_admin_family(family_id))
    );

create policy access_requests_update_admin on public.access_requests
    for update using (
        public.is_super_admin()
        or (family_id is not null and public.can_admin_family(family_id))
    )
    with check (
        public.is_super_admin()
        or (family_id is not null and public.can_admin_family(family_id))
    );

-- =====================================================================
-- activity_log — readable by admins; written only via definer RPCs
-- =====================================================================
create policy activity_log_select on public.activity_log
    for select using (
        public.is_super_admin()
        or (family_id is not null and public.can_admin_family(family_id))
    );

-- =====================================================================
-- changelog — public read, writes via RPC / super admin
-- =====================================================================
create policy changelog_select on public.changelog
    for select using (
        family_id is null
        or public.is_super_admin()
        or public.is_family_member(family_id)
        or exists (
            select 1 from public.families f
            where f.id = changelog.family_id and f.is_public_visible
        )
    );

create policy changelog_write_super_admin on public.changelog
    for all using (public.is_super_admin())
    with check (public.is_super_admin());
