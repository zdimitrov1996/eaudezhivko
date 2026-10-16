-- Eau de Fragrances: initial schema
-- Run once in Supabase → SQL Editor (or with `supabase db push`).

-- ---------------------------------------------------------------------------
-- Shared perfume catalog
-- ---------------------------------------------------------------------------
create table public.perfumes (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (char_length(brand) between 1 and 100),
  name text not null check (char_length(name) between 1 and 150),
  concentration text check (
    concentration in ('extrait', 'parfum', 'edp', 'edt', 'edc', 'eau_fraiche', 'other')
  ),
  release_year smallint check (release_year between 1700 and 2100),
  fragrantica_url text check (
    fragrantica_url ~ '^https://([a-z0-9-]+\.)?fragrantica\.[a-z.]{2,6}/'
  ),
  parfumo_url text check (
    parfumo_url ~ '^https://([a-z0-9-]+\.)?parfumo\.[a-z.]{2,6}/'
  ),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One catalog entry per brand + name + concentration (case-insensitive)
create unique index perfumes_identity_idx
  on public.perfumes (lower(brand), lower(name), coalesce(concentration, ''));

create extension if not exists pg_trgm with schema extensions;
create index perfumes_search_idx
  on public.perfumes using gin ((brand || ' ' || name) extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- A user's shelves: collection (owned) and wishlist (want to buy)
-- ---------------------------------------------------------------------------
create type public.shelf as enum ('collection', 'wishlist');

create table public.user_perfumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  perfume_id uuid not null references public.perfumes (id) on delete cascade,
  shelf public.shelf not null,
  rating smallint check (rating between 1 and 10),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A perfume sits on one shelf at a time; moving it updates `shelf`
  unique (user_id, perfume_id)
);

create index user_perfumes_user_shelf_idx on public.user_perfumes (user_id, shelf, created_at desc);
create index user_perfumes_perfume_idx on public.user_perfumes (perfume_id);

-- ---------------------------------------------------------------------------
-- updated_at bookkeeping
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger perfumes_updated_at
  before update on public.perfumes
  for each row execute function public.set_updated_at();

create trigger user_perfumes_updated_at
  before update on public.user_perfumes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.perfumes enable row level security;
alter table public.user_perfumes enable row level security;

-- Explicit Data API grants (the policies below decide which rows)
grant select on public.perfumes to anon, authenticated;
grant insert, update on public.perfumes to authenticated;
grant select, insert, update, delete on public.user_perfumes to authenticated;

create policy "Catalog is readable by everyone"
  on public.perfumes for select
  to anon, authenticated
  using (true);

create policy "Signed-in users can add to the catalog"
  on public.perfumes for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "Creators can edit their catalog entries"
  on public.perfumes for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "Users see their own shelves"
  on public.user_perfumes for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users add to their own shelves"
  on public.user_perfumes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update their own shelves"
  on public.user_perfumes for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users remove from their own shelves"
  on public.user_perfumes for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Aggregate community stats (no per-user data leaves the database)
create function public.perfume_stats(p_ids uuid[])
returns table (
  perfume_id uuid,
  avg_rating numeric,
  rating_count integer,
  collectors integer,
  wishers integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    up.perfume_id,
    round(avg(up.rating)::numeric, 1),
    count(up.rating)::integer,
    (count(*) filter (where up.shelf = 'collection'))::integer,
    (count(*) filter (where up.shelf = 'wishlist'))::integer
  from public.user_perfumes up
  where up.perfume_id = any (p_ids)
  group by up.perfume_id;
$$;

revoke execute on function public.perfume_stats(uuid[]) from public;
grant execute on function public.perfume_stats(uuid[]) to anon, authenticated;

-- Catalogue search: every word must appear in "brand name", best matches first
create function public.search_perfumes(q text)
returns setof public.perfumes
language sql
stable
set search_path = ''
as $$
  select p.*
  from public.perfumes p
  where char_length(trim(q)) >= 2
    and (p.brand || ' ' || p.name) ilike all (
      array(
        select '%' || replace(replace(replace(word, '\', '\\'), '%', '\%'), '_', '\_') || '%'
        from unnest(regexp_split_to_array(trim(q), '\s+')) as word
      )
    )
  order by extensions.similarity(p.brand || ' ' || p.name, q) desc, p.brand, p.name
  limit 10;
$$;

grant execute on function public.search_perfumes(text) to anon, authenticated;

-- Let any signed-in user fill in a missing Fragrantica / Parfumo link,
-- without being able to overwrite links someone already set.
create function public.fill_perfume_links(
  p_perfume_id uuid,
  p_fragrantica_url text,
  p_parfumo_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  update public.perfumes
  set
    fragrantica_url = coalesce(fragrantica_url, nullif(p_fragrantica_url, '')),
    parfumo_url = coalesce(parfumo_url, nullif(p_parfumo_url, ''))
  where id = p_perfume_id
    and (
      (fragrantica_url is null and nullif(p_fragrantica_url, '') is not null)
      or (parfumo_url is null and nullif(p_parfumo_url, '') is not null)
    );
end;
$$;

revoke execute on function public.fill_perfume_links(uuid, text, text) from public, anon;
grant execute on function public.fill_perfume_links(uuid, text, text) to authenticated;

-- GDPR: users can delete their own account; their shelves cascade away
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
