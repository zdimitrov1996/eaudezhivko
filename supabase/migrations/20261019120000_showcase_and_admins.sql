-- Eau de Fragrances: homepage carousel chosen in the admin panel, and an
-- owner who adds and removes admins there.
-- Run once in Supabase → SQL Editor, after 20261017150000_perfume_image.sql.
--
-- Everyone already in public.admins becomes an owner. Only owners can change
-- who is an admin; admins can use the rest of the panel, carousel included.
-- As before, every admin_* function checks the caller's role itself.

-- ---------------------------------------------------------------------------
-- Owner and admins
-- ---------------------------------------------------------------------------
alter table public.admins
  add column role text not null default 'admin' check (role in ('owner', 'admin')),
  add column added_by uuid references auth.users (id) on delete set null;

update public.admins set role = 'owner';

create function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid()) and role = 'owner'
  );
$$;

revoke execute on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

-- The audit log also records who made or removed an admin
alter table public.admin_audit_log drop constraint admin_audit_log_action_check;
alter table public.admin_audit_log add constraint admin_audit_log_action_check
  check (action in ('impersonate', 'delete_user', 'grant_admin', 'revoke_admin'));

-- Owner first, then admins in the order they were added
create function public.admin_list_admins()
returns table (
  user_id uuid,
  email text,
  role text,
  added_at timestamptz,
  added_by_email text
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
  select a.user_id, u.email::text, a.role, a.created_at, b.email::text
  from public.admins a
  join auth.users u on u.id = a.user_id
  left join auth.users b on b.id = a.added_by
  order by a.role = 'owner' desc, a.created_at;
end;
$$;

-- Owner only: makes a registered user with a confirmed email an admin
create function public.admin_grant_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_user_id uuid;
  v_email text;
  v_confirmed boolean;
begin
  if not public.is_owner() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select u.id, u.email::text, u.email_confirmed_at is not null
  into v_user_id, v_email, v_confirmed
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  if not v_confirmed then
    raise exception 'email not confirmed' using errcode = '55000';
  end if;
  if exists (select 1 from public.admins where user_id = v_user_id) then
    raise exception 'already an admin' using errcode = '23505';
  end if;

  insert into public.admins (user_id, role, added_by) values (v_user_id, 'admin', v_owner_id);

  insert into public.admin_audit_log (admin_id, admin_email, action, target_user_id, target_email)
  select v_owner_id, u.email::text, 'grant_admin', v_user_id, v_email
  from auth.users u where u.id = v_owner_id;

  return v_user_id;
end;
$$;

-- Owner only: takes admin rights away (never from an owner)
create function public.admin_revoke_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_role text;
  v_email text;
begin
  if not public.is_owner() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select a.role, u.email::text into v_role, v_email
  from public.admins a
  left join auth.users u on u.id = a.user_id
  where a.user_id = p_user_id;

  if v_role is null then
    raise exception 'not an admin' using errcode = 'P0002';
  end if;
  if v_role = 'owner' then
    raise exception 'cannot remove an owner' using errcode = '42501';
  end if;

  delete from public.admins where user_id = p_user_id;

  insert into public.admin_audit_log (admin_id, admin_email, action, target_user_id, target_email)
  select v_owner_id, u.email::text, 'revoke_admin', p_user_id, v_email
  from auth.users u where u.id = v_owner_id;
end;
$$;

revoke execute on function public.admin_list_admins() from public, anon;
revoke execute on function public.admin_grant_admin(text) from public, anon;
revoke execute on function public.admin_revoke_admin(uuid) from public, anon;
grant execute on function public.admin_list_admins() to authenticated;
grant execute on function public.admin_grant_admin(text) to authenticated;
grant execute on function public.admin_revoke_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Homepage carousel: catalogue perfumes with a Parfumo link and picture
-- ---------------------------------------------------------------------------
create table public.showcase_perfumes (
  perfume_id uuid primary key references public.perfumes (id) on delete cascade,
  position integer not null,
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Everyone may read it (the homepage shows it); changes go through the
-- admin_showcase_* functions below
alter table public.showcase_perfumes enable row level security;
grant select on public.showcase_perfumes to anon, authenticated;

create policy "Homepage carousel is readable by everyone"
  on public.showcase_perfumes for select
  to anon, authenticated
  using (true);

create function public.admin_showcase_add(p_perfume_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.perfumes
    where id = p_perfume_id and parfumo_url is not null and image_url is not null
  ) then
    raise exception 'perfume needs a Parfumo link and picture' using errcode = '22023';
  end if;
  if exists (select 1 from public.showcase_perfumes where perfume_id = p_perfume_id) then
    return;
  end if;
  if (select count(*) from public.showcase_perfumes) >= 12 then
    raise exception 'carousel is full' using errcode = '54000';
  end if;

  insert into public.showcase_perfumes (perfume_id, position, added_by)
  values (
    p_perfume_id,
    coalesce((select max(position) from public.showcase_perfumes), 0) + 1,
    (select auth.uid())
  );
end;
$$;

create function public.admin_showcase_remove(p_perfume_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.showcase_perfumes where perfume_id = p_perfume_id) then
    return;
  end if;
  if (select count(*) from public.showcase_perfumes) <= 1 then
    raise exception 'carousel needs at least one perfume' using errcode = '23514';
  end if;

  delete from public.showcase_perfumes where perfume_id = p_perfume_id;
end;
$$;

-- Swaps a perfume with its neighbour: p_offset < 0 moves it earlier, > 0 later
create function public.admin_showcase_move(p_perfume_id uuid, p_offset integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_position integer;
  v_other_id uuid;
  v_other_position integer;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select position into v_position from public.showcase_perfumes where perfume_id = p_perfume_id;
  if v_position is null then
    raise exception 'not in the carousel' using errcode = 'P0002';
  end if;

  if p_offset < 0 then
    select perfume_id, position into v_other_id, v_other_position
    from public.showcase_perfumes
    where position < v_position
    order by position desc
    limit 1;
  else
    select perfume_id, position into v_other_id, v_other_position
    from public.showcase_perfumes
    where position > v_position
    order by position
    limit 1;
  end if;

  if v_other_id is null then
    return;
  end if;

  update public.showcase_perfumes set position = v_other_position where perfume_id = p_perfume_id;
  update public.showcase_perfumes set position = v_position where perfume_id = v_other_id;
end;
$$;

revoke execute on function public.admin_showcase_add(uuid) from public, anon;
revoke execute on function public.admin_showcase_remove(uuid) from public, anon;
revoke execute on function public.admin_showcase_move(uuid, integer) from public, anon;
grant execute on function public.admin_showcase_add(uuid) to authenticated;
grant execute on function public.admin_showcase_remove(uuid) to authenticated;
grant execute on function public.admin_showcase_move(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Start with the eight perfumes the homepage showed so far. They join the
-- catalogue if missing; an existing entry only gets a link or picture it lacks.
-- ---------------------------------------------------------------------------
create temporary table showcase_seed (
  position integer,
  brand text,
  name text,
  concentration text,
  parfumo_url text,
  image_url text
);

insert into showcase_seed values
  (1, 'Maison Francis Kurkdjian', 'Baccarat Rouge 540', 'edp',
   'https://www.parfumo.com/Perfumes/Maison_Francis_Kurkdjian/Baccarat_Rouge_540_Eau_de_Parfum',
   'https://media.parfumo.com/perfumes/50/50639a-baccarat-rouge-540-eau-de-parfum-maison-francis-kurkdjian_1200.jpg?width=720&aspect_ratio=1:1'),
  (2, 'Dior', 'Sauvage', 'edt',
   'https://www.parfumo.com/Perfumes/Dior/Sauvage_Eau_de_Toilette',
   'https://media.parfumo.com/perfumes/a2/a28d94-sauvage-eau-de-toilette-dior_1200.jpg?width=720&aspect_ratio=1:1'),
  (3, 'Chanel', 'N°5', 'edp',
   'https://www.parfumo.com/Perfumes/Chanel/N5_Eau_de_Parfum',
   'https://media.parfumo.com/perfumes/23/23c42a-n-5-eau-de-parfum-chanel_1200.jpg?width=720&aspect_ratio=1:1'),
  (4, 'Tom Ford', 'Oud Wood', 'edp',
   'https://www.parfumo.com/Perfumes/Tom_Ford/Oud_Wood_Eau_de_Parfum',
   'https://media.parfumo.com/perfumes/cf/cf90e7-oud-wood-eau-de-parfum-tom-ford_1200.jpg?width=720&aspect_ratio=1:1'),
  (5, 'Yves Saint Laurent', 'Black Opium', 'edp',
   'https://www.parfumo.com/Perfumes/Yves_Saint_Laurent/Black_Opium',
   'https://media.parfumo.com/perfumes/2a/2a5099-black-opium-eau-de-parfum-yves-saint-laurent_1200.jpg?width=720&aspect_ratio=1:1'),
  (6, 'Creed', 'Aventus', 'edp',
   'https://www.parfumo.com/Perfumes/Creed/aventus',
   'https://media.parfumo.com/perfumes/66/66dd48_aventus-creed_1200.jpg?width=720&aspect_ratio=1:1'),
  (7, 'Le Labo', 'Santal 33', 'edp',
   'https://www.parfumo.com/Perfumes/Le_Labo/Santal_33_Eau_de_Parfum',
   'https://media.parfumo.com/perfumes/81/818cc5-santal-33-eau-de-parfum-le-labo_1200.jpg?width=720&aspect_ratio=1:1'),
  (8, 'Lancôme', 'La Vie est Belle', 'edp',
   'https://www.parfumo.com/Perfumes/Lancome/la-vie-est-belle-l-eau-de-parfum',
   'https://media.parfumo.com/perfumes/3b/3b0c61-la-vie-est-belle-l-eau-de-parfum-lancome_1200.jpg?width=720&aspect_ratio=1:1');

insert into public.perfumes (brand, name, concentration, parfumo_url, image_url, created_by)
select s.brand, s.name, s.concentration, s.parfumo_url, s.image_url, null
from showcase_seed s
on conflict (lower(brand), lower(name), coalesce(concentration, '')) do nothing;

update public.perfumes p
set parfumo_url = s.parfumo_url
from showcase_seed s
where lower(p.brand) = lower(s.brand)
  and lower(p.name) = lower(s.name)
  and coalesce(p.concentration, '') = s.concentration
  and p.parfumo_url is null;

-- The picture only fits if the entry links to the same Parfumo page
update public.perfumes p
set image_url = s.image_url
from showcase_seed s
where lower(p.brand) = lower(s.brand)
  and lower(p.name) = lower(s.name)
  and coalesce(p.concentration, '') = s.concentration
  and p.parfumo_url = s.parfumo_url
  and p.image_url is null;

insert into public.showcase_perfumes (perfume_id, position)
select p.id, s.position
from showcase_seed s
join public.perfumes p
  on lower(p.brand) = lower(s.brand)
  and lower(p.name) = lower(s.name)
  and coalesce(p.concentration, '') = s.concentration
where p.parfumo_url is not null and p.image_url is not null
on conflict (perfume_id) do nothing;

drop table showcase_seed;
