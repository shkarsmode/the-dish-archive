-- The Dish Archive — multi-family core schema
-- Phase 2: profiles, families, memberships, dishes (+ ownership/status/visibility),
-- recipe children, ratings, access requests, activity log, changelog.
-- All identifiers snake_case. Dishes keep a text id to preserve existing 'dish-NNN'
-- values and slug-based routing; child rows reference that text id.

-- gen_random_uuid() is available on Supabase without an extension.

-- =====================================================================
-- profiles: one row per authenticated user, mirrors auth.users
-- =====================================================================
create table if not exists public.profiles (
    id              uuid primary key references auth.users (id) on delete cascade,
    email           text not null unique,
    display_name    text,
    avatar_url      text,
    global_role     text not null default 'user'
                        check (global_role in ('super_admin', 'user')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    last_login_at   timestamptz
);

-- =====================================================================
-- families: a tenant. Each family owns its own recipe collection.
-- =====================================================================
create table if not exists public.families (
    id                  uuid primary key default gen_random_uuid(),
    slug                text not null unique,
    name                text not null,
    description         text,
    cover_image_url     text,
    avatar_image_url    text,
    theme_color         text,
    is_public_visible   boolean not null default false,
    status              text not null default 'active'
                            check (status in ('active', 'archived')),
    created_by_user_id  uuid references public.profiles (id) on delete set null,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- =====================================================================
-- family_members: membership + role + approval state
-- =====================================================================
create table if not exists public.family_members (
    id                      uuid primary key default gen_random_uuid(),
    family_id               uuid not null references public.families (id) on delete cascade,
    user_id                 uuid not null references public.profiles (id) on delete cascade,
    role                    text not null default 'viewer'
                                check (role in ('owner', 'admin', 'editor', 'viewer')),
    status                  text not null default 'pending'
                                check (status in ('pending', 'approved', 'rejected', 'removed')),
    approved_by_user_id     uuid references public.profiles (id) on delete set null,
    approved_at             timestamptz,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now(),
    unique (family_id, user_id)
);

create index if not exists idx_family_members_user on public.family_members (user_id);
create index if not exists idx_family_members_family on public.family_members (family_id);

-- =====================================================================
-- dishes: extends the original single-tenant dish with tenancy,
-- ownership, status/visibility and rating aggregates.
-- =====================================================================
create table if not exists public.dishes (
    id                  text primary key default gen_random_uuid()::text,
    family_id           uuid not null references public.families (id) on delete cascade,
    created_by_user_id  uuid references public.profiles (id) on delete set null,
    updated_by_user_id  uuid references public.profiles (id) on delete set null,
    title               text not null,
    slug                text not null,
    description         text not null default '',
    -- author/base rating kept for backward-compatible display;
    -- rating_average / rating_count are maintained from recipe_ratings.
    rating              numeric(3, 2) not null default 0 check (rating >= 0 and rating <= 5),
    rating_average      numeric(3, 2) not null default 0 check (rating_average >= 0 and rating_average <= 5),
    rating_count        integer not null default 0,
    price_amount        integer not null default 0,
    price_currency      text not null default 'UAH',
    prep_time           integer not null default 0,
    cook_time           integer not null default 0,
    total_time          integer not null default 0,
    calories            integer not null default 0,
    servings            integer not null default 0,
    difficulty          text not null default 'easy'
                            check (difficulty in ('easy', 'medium', 'hard')),
    tags                text[] not null default '{}',
    categories          text[] not null default '{}',
    taste_sweet         smallint not null default 0,
    taste_salty         smallint not null default 0,
    taste_sour          smallint not null default 0,
    taste_bitter        smallint not null default 0,
    taste_spicy         smallint not null default 0,
    taste_umami         smallint not null default 0,
    notes               text not null default '',
    source_url          text not null default '',
    visibility          text not null default 'family'
                            check (visibility in ('family', 'public')),
    -- Safe-by-default: new recipes are drafts until explicitly published.
    status              text not null default 'draft'
                            check (status in ('draft', 'published', 'archived')),
    view_count          integer not null default 0,
    cooked_count        integer not null default 0,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    unique (family_id, slug)
);

create index if not exists idx_dishes_family on public.dishes (family_id);
create index if not exists idx_dishes_status on public.dishes (status);
create index if not exists idx_dishes_visibility on public.dishes (visibility);

-- =====================================================================
-- dish children: images, ingredients, cooking steps
-- =====================================================================
create table if not exists public.dish_images (
    id          bigint generated by default as identity primary key,
    dish_id     text not null references public.dishes (id) on delete cascade,
    url         text not null,
    alt         text,
    is_primary  boolean not null default false,
    sort_order  integer not null default 0
);
create index if not exists idx_dish_images_dish on public.dish_images (dish_id);

create table if not exists public.ingredients (
    id          bigint generated by default as identity primary key,
    dish_id     text not null references public.dishes (id) on delete cascade,
    name        text not null,
    amount      text not null default '',
    unit        text not null default '',
    optional    boolean not null default false,
    sort_order  integer not null default 0
);
create index if not exists idx_ingredients_dish on public.ingredients (dish_id);

create table if not exists public.cooking_steps (
    id          bigint generated by default as identity primary key,
    dish_id     text not null references public.dishes (id) on delete cascade,
    step_order  integer not null default 0,
    description text not null default '',
    duration    integer,
    image_url   text
);
create index if not exists idx_cooking_steps_dish on public.cooking_steps (dish_id);

-- =====================================================================
-- recipe_ratings: one rating per user per dish
-- =====================================================================
create table if not exists public.recipe_ratings (
    id          uuid primary key default gen_random_uuid(),
    dish_id     text not null references public.dishes (id) on delete cascade,
    user_id     uuid not null references public.profiles (id) on delete cascade,
    family_id   uuid not null references public.families (id) on delete cascade,
    rating      smallint not null check (rating between 1 and 5),
    comment     text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    unique (dish_id, user_id)
);
create index if not exists idx_recipe_ratings_dish on public.recipe_ratings (dish_id);
create index if not exists idx_recipe_ratings_family on public.recipe_ratings (family_id);

-- =====================================================================
-- access_requests: a Google user asking for access (optionally to a family)
-- =====================================================================
create table if not exists public.access_requests (
    id                      uuid primary key default gen_random_uuid(),
    email                   text not null,
    family_id               uuid references public.families (id) on delete set null,
    requested_role          text check (requested_role in ('owner', 'admin', 'editor', 'viewer')),
    status                  text not null default 'pending'
                                check (status in ('pending', 'approved', 'rejected')),
    requested_by_user_id    uuid references public.profiles (id) on delete set null,
    reviewed_by_user_id     uuid references public.profiles (id) on delete set null,
    review_note             text,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);
create index if not exists idx_access_requests_status on public.access_requests (status);
create index if not exists idx_access_requests_family on public.access_requests (family_id);

-- =====================================================================
-- activity_log: audit trail for admin/family/recipe actions
-- =====================================================================
create table if not exists public.activity_log (
    id              uuid primary key default gen_random_uuid(),
    actor_user_id   uuid references public.profiles (id) on delete set null,
    family_id       uuid references public.families (id) on delete set null,
    entity_type     text not null,
    entity_id       text,
    action          text not null,
    metadata        jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null default now()
);
create index if not exists idx_activity_log_family on public.activity_log (family_id);
create index if not exists idx_activity_log_actor on public.activity_log (actor_user_id);
create index if not exists idx_activity_log_created on public.activity_log (created_at desc);

-- =====================================================================
-- changelog: preserved from the original app (global history feed)
-- family_id is optional so it can become per-family later.
-- =====================================================================
create table if not exists public.changelog (
    id          bigint generated by default as identity primary key,
    family_id   uuid references public.families (id) on delete cascade,
    version     text not null default '',
    title       text not null default '',
    description text,
    action      text not null default 'improved'
                    check (action in ('added', 'updated', 'removed', 'fixed', 'improved')),
    dish_id     text,
    dish_title  text,
    changes     text[] not null default '{}',
    date        timestamptz not null default now()
);
create index if not exists idx_changelog_date on public.changelog (date desc);
create index if not exists idx_changelog_family on public.changelog (family_id);
