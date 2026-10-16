-- Eau de Fragrances: read-only admin panel
-- Run once in Supabase → SQL Editor, after 20261016000000_init.sql.
--
-- Admin data is only reachable through the security-definer functions below,
-- and every one of them checks is_admin() first. The publishable key alone
-- can't read other users' data.

-- ---------------------------------------------------------------------------
-- Who may open the admin panel
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS on and no policies: only the functions below can read this table
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Overview numbers
-- ---------------------------------------------------------------------------
create function public.admin_overview()
returns table (
  total_users integer,
  new_users_7d integer,
  catalog_perfumes integer,
  collection_entries integer,
  wishlist_entries integer,
  ratings_given integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from auth.users)::integer,
    (select count(*) from auth.users where auth.users.created_at > now() - interval '7 days')::integer,
    (select count(*) from public.perfumes)::integer,
    (select count(*) from public.user_perfumes where public.user_perfumes.shelf = 'collection')::integer,
    (select count(*) from public.user_perfumes where public.user_perfumes.shelf = 'wishlist')::integer,
    (select count(public.user_perfumes.rating) from public.user_perfumes)::integer;
end;
$$;

-- ---------------------------------------------------------------------------
-- Registered users, newest first (optionally one user, or an email search)
-- ---------------------------------------------------------------------------
create function public.admin_users(
  p_search text default null,
  p_user_id uuid default null
)
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed boolean,
  providers text[],
  collection_count integer,
  wishlist_count integer,
  is_admin boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at is not null,
    array(select jsonb_array_elements_text(coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb))),
    (select count(*) from public.user_perfumes up where up.user_id = u.id and up.shelf = 'collection')::integer,
    (select count(*) from public.user_perfumes up where up.user_id = u.id and up.shelf = 'wishlist')::integer,
    exists (select 1 from public.admins a where a.user_id = u.id)
  from auth.users u
  where (p_user_id is null or u.id = p_user_id)
    and (
      nullif(trim(p_search), '') is null
      or u.email ilike '%' || replace(replace(replace(trim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  order by u.created_at desc
  limit 500;
end;
$$;

-- ---------------------------------------------------------------------------
-- One user's collection and wishlist
-- ---------------------------------------------------------------------------
create function public.admin_user_shelves(p_user_id uuid)
returns table (
  entry_id uuid,
  shelf public.shelf,
  rating smallint,
  added_at timestamptz,
  perfume_id uuid,
  brand text,
  name text,
  concentration text,
  release_year smallint,
  fragrantica_url text,
  parfumo_url text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    up.id,
    up.shelf,
    up.rating,
    up.created_at,
    p.id,
    p.brand,
    p.name,
    p.concentration,
    p.release_year,
    p.fragrantica_url,
    p.parfumo_url
  from public.user_perfumes up
  join public.perfumes p on p.id = up.perfume_id
  where up.user_id = p_user_id
  order by up.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Whole catalogue with popularity and who added each perfume
-- ---------------------------------------------------------------------------
create function public.admin_perfumes()
returns table (
  id uuid,
  brand text,
  name text,
  concentration text,
  release_year smallint,
  fragrantica_url text,
  parfumo_url text,
  created_at timestamptz,
  created_by_email text,
  collectors integer,
  wishers integer,
  avg_rating numeric,
  rating_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.brand,
    p.name,
    p.concentration,
    p.release_year,
    p.fragrantica_url,
    p.parfumo_url,
    p.created_at,
    u.email::text,
    coalesce(s.collectors, 0),
    coalesce(s.wishers, 0),
    s.avg_rating,
    coalesce(s.rating_count, 0)
  from public.perfumes p
  left join auth.users u on u.id = p.created_by
  left join lateral (
    select
      (count(*) filter (where up.shelf = 'collection'))::integer as collectors,
      (count(*) filter (where up.shelf = 'wishlist'))::integer as wishers,
      round(avg(up.rating)::numeric, 1) as avg_rating,
      count(up.rating)::integer as rating_count
    from public.user_perfumes up
    where up.perfume_id = p.id
  ) s on true
  order by coalesce(s.collectors, 0) + coalesce(s.wishers, 0) desc, p.brand, p.name
  limit 1000;
end;
$$;

-- ---------------------------------------------------------------------------
-- Audit log of admin actions (who did what to whom, and when)
-- ---------------------------------------------------------------------------
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users (id) on delete set null,
  admin_email text,
  action text not null check (action in ('impersonate', 'delete_user')),
  target_user_id uuid,
  target_email text,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

create function public.admin_recent_actions()
returns table (
  id bigint,
  admin_email text,
  action text,
  target_user_id uuid,
  target_email text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select l.id, l.admin_email, l.action, l.target_user_id, l.target_email, l.created_at
  from public.admin_audit_log l
  order by l.created_at desc
  limit 50;
end;
$$;

-- Checks a support login is allowed, logs it, and returns the target's email.
-- The session itself is created by the server with the Supabase secret key.
create function public.admin_begin_impersonation(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_user_id = v_admin_id then
    raise exception 'cannot impersonate yourself' using errcode = '22023';
  end if;
  if exists (select 1 from public.admins where user_id = p_user_id) then
    raise exception 'cannot impersonate an admin' using errcode = '42501';
  end if;

  select u.email::text into v_email from auth.users u where u.id = p_user_id;
  if v_email is null then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_log (admin_id, admin_email, action, target_user_id, target_email)
  select v_admin_id, u.email::text, 'impersonate', p_user_id, v_email
  from auth.users u where u.id = v_admin_id;

  return v_email;
end;
$$;

-- Deletes a user account; their shelves cascade away
create function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_user_id = v_admin_id then
    raise exception 'use account settings to delete yourself' using errcode = '22023';
  end if;
  if exists (select 1 from public.admins where user_id = p_user_id) then
    raise exception 'cannot delete an admin' using errcode = '42501';
  end if;

  select u.email::text into v_email from auth.users u where u.id = p_user_id;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_log (admin_id, admin_email, action, target_user_id, target_email)
  select v_admin_id, u.email::text, 'delete_user', p_user_id, v_email
  from auth.users u where u.id = v_admin_id;

  delete from auth.users where id = p_user_id;
end;
$$;

revoke execute on function public.admin_recent_actions() from public, anon;
revoke execute on function public.admin_begin_impersonation(uuid) from public, anon;
revoke execute on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_recent_actions() to authenticated;
grant execute on function public.admin_begin_impersonation(uuid) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

revoke execute on function public.admin_overview() from public, anon;
revoke execute on function public.admin_users(text, uuid) from public, anon;
revoke execute on function public.admin_user_shelves(uuid) from public, anon;
revoke execute on function public.admin_perfumes() from public, anon;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_users(text, uuid) to authenticated;
grant execute on function public.admin_user_shelves(uuid) to authenticated;
grant execute on function public.admin_perfumes() to authenticated;
