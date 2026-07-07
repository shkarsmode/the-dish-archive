-- The Dish Archive — real (DB-backed) likes with a maintained like_count.

create table if not exists public.dish_likes (
    id          uuid primary key default gen_random_uuid(),
    dish_id     text not null references public.dishes (id) on delete cascade,
    user_id     uuid not null references public.profiles (id) on delete cascade,
    created_at  timestamptz not null default now(),
    unique (dish_id, user_id)
);
create index if not exists idx_dish_likes_dish on public.dish_likes (dish_id);
create index if not exists idx_dish_likes_user on public.dish_likes (user_id);

alter table public.dishes add column if not exists like_count integer not null default 0;

-- Keep dishes.like_count in sync (system update; skip the dish guard/updated_at).
create or replace function public.recompute_dish_likes(target_dish text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    perform set_config('app.skip_dish_guard', 'on', true);
    update public.dishes
        set like_count = (select count(*) from public.dish_likes where dish_id = target_dish)
        where id = target_dish;
    perform set_config('app.skip_dish_guard', 'off', true);
end;
$$;

create or replace function public.on_like_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'DELETE' then
        perform public.recompute_dish_likes(old.dish_id);
        return old;
    end if;
    perform public.recompute_dish_likes(new.dish_id);
    return new;
end;
$$;

drop trigger if exists trg_like_change on public.dish_likes;
create trigger trg_like_change
    after insert or delete on public.dish_likes
    for each row execute function public.on_like_change();

alter table public.dish_likes enable row level security;

create policy dish_likes_select on public.dish_likes
    for select using (public.can_view_dish(dish_id) or public.is_super_admin());
create policy dish_likes_insert on public.dish_likes
    for insert with check (user_id = auth.uid() and public.can_view_dish(dish_id));
create policy dish_likes_delete on public.dish_likes
    for delete using (user_id = auth.uid());
