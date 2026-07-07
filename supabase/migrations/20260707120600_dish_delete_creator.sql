-- Allow a recipe's own creator to delete it, in addition to family owners/admins
-- and the super admin. Editors can create + edit recipes; this lets the person
-- who added a recipe also remove it, while non-creator editors still cannot.
drop policy if exists dishes_delete on public.dishes;
create policy dishes_delete on public.dishes
    for delete using (
        public.can_admin_family(family_id)
        or created_by_user_id = auth.uid()
    );
