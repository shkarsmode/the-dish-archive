-- The Dish Archive — Storage buckets for recipe & family imagery.
-- Buckets are public-read (images render in the catalog/detail without auth);
-- writes require an authenticated user, and objects may only be modified by
-- their uploader. Finer family-scoped write rules can be layered on later via
-- the object path prefix.

insert into storage.buckets (id, name, public)
values
    ('recipe-images', 'recipe-images', true),
    ('family-covers', 'family-covers', true),
    ('family-avatars', 'family-avatars', true)
on conflict (id) do nothing;

create policy "tda_storage_public_read" on storage.objects
    for select
    using (bucket_id in ('recipe-images', 'family-covers', 'family-avatars'));

create policy "tda_storage_authenticated_insert" on storage.objects
    for insert to authenticated
    with check (bucket_id in ('recipe-images', 'family-covers', 'family-avatars'));

create policy "tda_storage_owner_update" on storage.objects
    for update to authenticated
    using (owner = auth.uid())
    with check (bucket_id in ('recipe-images', 'family-covers', 'family-avatars'));

create policy "tda_storage_owner_delete" on storage.objects
    for delete to authenticated
    using (owner = auth.uid());
