-- The Dish Archive — privileged RPCs (SECURITY DEFINER)
-- These are the ONLY sanctioned path for multi-step admin actions and for any
-- write to family_members / recipe_ratings. Each re-checks authorization
-- internally (rank-aware) and writes an activity_log row, so clients never
-- need broad table grants.

-- Internal audit writer (never called directly by clients).
create or replace function public.log_activity(
    p_family uuid,
    p_entity_type text,
    p_entity_id text,
    p_action text,
    p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
    insert into public.activity_log (actor_user_id, family_id, entity_type, entity_id, action, metadata)
    values (auth.uid(), p_family, p_entity_type, p_entity_id, p_action, coalesce(p_metadata, '{}'::jsonb));
$$;

-- Rank rule: who may grant/assign a given role in a family. Raises on failure.
create or replace function public.assert_can_grant_role(p_family uuid, p_target_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_role text;
begin
    if p_target_role not in ('owner', 'admin', 'editor', 'viewer') then
        raise exception 'Invalid role: %', p_target_role;
    end if;
    if public.is_super_admin() then
        return;
    end if;
    v_role := public.family_role(p_family);
    if v_role is null then
        raise exception 'Not a member of this family';
    end if;
    -- Only owners (or super admin) may grant the elevated owner/admin roles.
    if p_target_role in ('owner', 'admin') and v_role <> 'owner' then
        raise exception 'Only a family owner or super admin can grant owner/admin roles';
    end if;
    if p_target_role in ('editor', 'viewer') and v_role not in ('owner', 'admin') then
        raise exception 'Not authorized to manage members of this family';
    end if;
end;
$$;

create or replace function public.owner_count(p_family uuid)
returns integer
language sql
security definer
set search_path = public
as $$
    select count(*)::int from public.family_members
    where family_id = p_family and role = 'owner' and status = 'approved';
$$;

-- Keep the current user's last_login_at fresh (called after session restore).
create or replace function public.touch_last_login()
returns void
language sql
security definer
set search_path = public
as $$
    update public.profiles set last_login_at = now() where id = auth.uid();
$$;

-- Any authenticated user may ask for access (optionally to a specific family).
create or replace function public.request_access(
    p_family uuid default null,
    p_requested_role text default 'viewer'
)
returns public.access_requests
language plpgsql
security definer
set search_path = public
as $$
declare
    v_email text;
    v_row public.access_requests;
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;
    select email into v_email from public.profiles where id = auth.uid();

    insert into public.access_requests (email, family_id, requested_role, requested_by_user_id, status)
    values (v_email, p_family, coalesce(p_requested_role, 'viewer'), auth.uid(), 'pending')
    returning * into v_row;

    perform public.log_activity(p_family, 'access_request', v_row.id::text, 'requested',
        jsonb_build_object('email', v_email, 'requested_role', p_requested_role));
    return v_row;
end;
$$;

-- Super admin creates a family and (optionally) seats an initial owner.
create or replace function public.create_family(
    p_slug text,
    p_name text,
    p_description text default null,
    p_theme_color text default null,
    p_owner_user_id uuid default null
)
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
    v_family public.families;
begin
    if not public.is_super_admin() then
        raise exception 'Only a super admin can create families';
    end if;

    insert into public.families (slug, name, description, theme_color, created_by_user_id)
    values (p_slug, p_name, p_description, p_theme_color, auth.uid())
    returning * into v_family;

    if p_owner_user_id is not null then
        insert into public.family_members (family_id, user_id, role, status, approved_by_user_id, approved_at)
        values (v_family.id, p_owner_user_id, 'owner', 'approved', auth.uid(), now())
        on conflict (family_id, user_id) do update
            set role = 'owner', status = 'approved', approved_by_user_id = auth.uid(), approved_at = now();
    end if;

    perform public.log_activity(v_family.id, 'family', v_family.id::text, 'created',
        jsonb_build_object('slug', p_slug, 'name', p_name));
    return v_family;
end;
$$;

-- Directly seat/upgrade a member (owner/admin/super). Rank-checked.
create or replace function public.add_family_member(
    p_family uuid,
    p_user_id uuid,
    p_role text default 'viewer'
)
returns public.family_members
language plpgsql
security definer
set search_path = public
as $$
declare
    v_member public.family_members;
    v_role text := coalesce(p_role, 'viewer');
begin
    if not (public.is_super_admin() or public.can_admin_family(p_family)) then
        raise exception 'Not authorized to manage members of this family';
    end if;
    perform public.assert_can_grant_role(p_family, v_role);

    insert into public.family_members (family_id, user_id, role, status, approved_by_user_id, approved_at)
    values (p_family, p_user_id, v_role, 'approved', auth.uid(), now())
    on conflict (family_id, user_id) do update
        set role = v_role, status = 'approved', approved_by_user_id = auth.uid(), approved_at = now()
    returning * into v_member;

    perform public.log_activity(p_family, 'family_member', v_member.id::text, 'added',
        jsonb_build_object('user_id', p_user_id, 'role', v_role));
    return v_member;
end;
$$;

-- Approve an access request: seat the member (rank-checked) and close the request.
create or replace function public.approve_access_request(
    p_request_id uuid,
    p_family uuid,
    p_role text default 'viewer'
)
returns public.family_members
language plpgsql
security definer
set search_path = public
as $$
declare
    v_request public.access_requests;
    v_member public.family_members;
    v_user_id uuid;
    v_family uuid;
    v_role text := coalesce(p_role, 'viewer');
begin
    select * into v_request from public.access_requests where id = p_request_id;
    if not found then
        raise exception 'Access request not found';
    end if;
    if v_request.status <> 'pending' then
        raise exception 'Request already reviewed';
    end if;

    -- The target family comes from the request when it named one; a global
    -- request (family_id null) requires the approver to name the family.
    v_family := coalesce(v_request.family_id, p_family);
    if v_family is null then
        raise exception 'No target family specified';
    end if;
    if v_request.family_id is not null and p_family is not null and p_family <> v_request.family_id then
        raise exception 'Cannot approve this request into a different family';
    end if;

    if not (public.is_super_admin() or public.can_admin_family(v_family)) then
        raise exception 'Not authorized to approve for this family';
    end if;
    perform public.assert_can_grant_role(v_family, v_role);

    v_user_id := v_request.requested_by_user_id;
    if v_user_id is null then
        select id into v_user_id from public.profiles where email = lower(trim(v_request.email));
    end if;
    if v_user_id is null then
        raise exception 'Requesting user has not signed in yet';
    end if;

    insert into public.family_members (family_id, user_id, role, status, approved_by_user_id, approved_at)
    values (v_family, v_user_id, v_role, 'approved', auth.uid(), now())
    on conflict (family_id, user_id) do update
        set role = v_role, status = 'approved', approved_by_user_id = auth.uid(), approved_at = now()
    returning * into v_member;

    update public.access_requests
        set status = 'approved', reviewed_by_user_id = auth.uid(), updated_at = now()
        where id = p_request_id;

    perform public.log_activity(v_family, 'family_member', v_member.id::text, 'approved',
        jsonb_build_object('user_id', v_user_id, 'role', v_role, 'request_id', p_request_id));
    return v_member;
end;
$$;

create or replace function public.reject_access_request(
    p_request_id uuid,
    p_note text default null
)
returns public.access_requests
language plpgsql
security definer
set search_path = public
as $$
declare
    v_request public.access_requests;
begin
    select * into v_request from public.access_requests where id = p_request_id;
    if not found then
        raise exception 'Access request not found';
    end if;
    if not (public.is_super_admin() or (v_request.family_id is not null and public.can_admin_family(v_request.family_id))) then
        raise exception 'Not authorized to review this request';
    end if;

    update public.access_requests
        set status = 'rejected', reviewed_by_user_id = auth.uid(), review_note = p_note, updated_at = now()
        where id = p_request_id
        returning * into v_request;

    perform public.log_activity(v_request.family_id, 'access_request', p_request_id::text, 'rejected',
        jsonb_build_object('note', p_note));
    return v_request;
end;
$$;

-- Set a member's role (rank-checked; cannot self-escalate or strand a family).
create or replace function public.set_member_role(
    p_member_id uuid,
    p_role text
)
returns public.family_members
language plpgsql
security definer
set search_path = public
as $$
declare
    v_member public.family_members;
begin
    select * into v_member from public.family_members where id = p_member_id;
    if not found then
        raise exception 'Member not found';
    end if;
    if not public.can_admin_family(v_member.family_id) then
        raise exception 'Not authorized to manage members of this family';
    end if;
    if not public.is_super_admin() and v_member.user_id = auth.uid() then
        raise exception 'You cannot change your own role';
    end if;
    -- Only owners (or super admin) may touch an existing owner.
    if v_member.role = 'owner'
       and not public.is_super_admin()
       and public.family_role(v_member.family_id) <> 'owner' then
        raise exception 'Only an owner or super admin can change an owner''s role';
    end if;
    perform public.assert_can_grant_role(v_member.family_id, p_role);
    if v_member.role = 'owner' and p_role <> 'owner' and public.owner_count(v_member.family_id) <= 1 then
        raise exception 'Cannot demote the last owner of the family';
    end if;

    update public.family_members set role = p_role, updated_at = now()
        where id = p_member_id
        returning * into v_member;

    perform public.log_activity(v_member.family_id, 'family_member', p_member_id::text, 'role_changed',
        jsonb_build_object('role', p_role));
    return v_member;
end;
$$;

-- Remove a member (soft: status = 'removed'); protects the last owner.
create or replace function public.remove_member(p_member_id uuid)
returns public.family_members
language plpgsql
security definer
set search_path = public
as $$
declare
    v_member public.family_members;
begin
    select * into v_member from public.family_members where id = p_member_id;
    if not found then
        raise exception 'Member not found';
    end if;
    if not public.can_admin_family(v_member.family_id) then
        raise exception 'Not authorized to manage members of this family';
    end if;
    if v_member.role = 'owner' then
        if not public.is_super_admin() and public.family_role(v_member.family_id) <> 'owner' then
            raise exception 'Only an owner or super admin can remove an owner';
        end if;
        if public.owner_count(v_member.family_id) <= 1 then
            raise exception 'Cannot remove the last owner of the family';
        end if;
    end if;

    update public.family_members set status = 'removed', updated_at = now()
        where id = p_member_id
        returning * into v_member;

    perform public.log_activity(v_member.family_id, 'family_member', p_member_id::text, 'removed', '{}'::jsonb);
    return v_member;
end;
$$;

-- Rate a dish. family_id is DERIVED from the dish — never trusted from client.
-- One rating per (dish, user); calling again updates the existing rating.
create or replace function public.rate_dish(
    p_dish_id text,
    p_rating smallint,
    p_comment text default null
)
returns public.recipe_ratings
language plpgsql
security definer
set search_path = public
as $$
declare
    v_family uuid;
    v_row public.recipe_ratings;
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;
    if p_rating is null or p_rating < 1 or p_rating > 5 then
        raise exception 'Rating must be between 1 and 5';
    end if;
    select family_id into v_family from public.dishes where id = p_dish_id;
    if v_family is null then
        raise exception 'Dish not found';
    end if;
    if not public.can_view_dish(p_dish_id) then
        raise exception 'Not authorized to rate this recipe';
    end if;
    if not (public.is_super_admin() or public.is_family_member(v_family)) then
        raise exception 'Only family members can rate this recipe';
    end if;

    insert into public.recipe_ratings (dish_id, user_id, family_id, rating, comment)
    values (p_dish_id, auth.uid(), v_family, p_rating, p_comment)
    on conflict (dish_id, user_id) do update
        set rating = excluded.rating, comment = excluded.comment, updated_at = now()
    returning * into v_row;

    return v_row;
end;
$$;

-- =====================================================================
-- Execution grants: internal helpers stay private; client RPCs go to
-- 'authenticated' only (each definer body still enforces finer authz).
-- =====================================================================
revoke execute on function
    public.log_activity(uuid, text, text, text, jsonb),
    public.assert_can_grant_role(uuid, text),
    public.owner_count(uuid),
    public.touch_last_login(),
    public.request_access(uuid, text),
    public.create_family(text, text, text, text, uuid),
    public.add_family_member(uuid, uuid, text),
    public.approve_access_request(uuid, uuid, text),
    public.reject_access_request(uuid, text),
    public.set_member_role(uuid, text),
    public.remove_member(uuid),
    public.rate_dish(text, smallint, text)
from public, anon;

grant execute on function
    public.touch_last_login(),
    public.request_access(uuid, text),
    public.create_family(text, text, text, text, uuid),
    public.add_family_member(uuid, uuid, text),
    public.approve_access_request(uuid, uuid, text),
    public.reject_access_request(uuid, text),
    public.set_member_role(uuid, text),
    public.remove_member(uuid),
    public.rate_dish(text, smallint, text)
to authenticated;
