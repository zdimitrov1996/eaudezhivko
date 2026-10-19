-- Eau de Fragrances: admins type carousel perfumes in (brand, name, Parfumo
-- link) instead of picking them from the catalogue. The server reads the
-- picture and rating from the Parfumo page and saves them with the entry.
-- Run once in Supabase → SQL Editor, after 20261019120000_showcase_and_admins.sql.

create table public.showcase (
  id uuid primary key default gen_random_uuid(),
  position integer not null,
  brand text not null check (char_length(brand) between 1 and 100),
  name text not null check (char_length(name) between 1 and 150),
  concentration text check (
    concentration in ('extrait', 'parfum', 'edp', 'edt', 'edc', 'eau_fraiche', 'other')
  ),
  parfumo_url text not null check (parfumo_url ~ '^https://([a-z0-9-]+\.)?parfumo\.[a-z.]{2,6}/'),
  image_url text not null check (
    image_url ~ '^https://([a-z0-9-]+\.)?parfumo\.[a-z.]{2,6}/'
    and image_url <> 'https://parfumo.com/no-image'
  ),
  parfumo_rating numeric(3, 1) check (parfumo_rating between 0 and 10),
  -- When the Parfumo page was last read; null means never
  parfumo_read_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Everyone may read it (the homepage shows it); changes go through the
-- admin_showcase_* functions below
alter table public.showcase enable row level security;
grant select on public.showcase to anon, authenticated;

create policy "Homepage carousel is readable by everyone"
  on public.showcase for select
  to anon, authenticated
  using (true);

-- Keep the carousel as it is today
insert into public.showcase (
  position, brand, name, concentration, parfumo_url, image_url, parfumo_rating, parfumo_read_at
)
select s.position, p.brand, p.name, p.concentration, p.parfumo_url, p.image_url, p.parfumo_rating, p.ratings_updated_at
from public.showcase_perfumes s
join public.perfumes p on p.id = s.perfume_id
where p.parfumo_url ~ '^https://([a-z0-9-]+\.)?parfumo\.[a-z.]{2,6}/'
  and p.image_url ~ '^https://([a-z0-9-]+\.)?parfumo\.[a-z.]{2,6}/'
  and p.image_url <> 'https://parfumo.com/no-image';

drop function public.admin_showcase_add(uuid);
drop function public.admin_showcase_remove(uuid);
drop function public.admin_showcase_move(uuid, integer);
drop table public.showcase_perfumes;

-- Adds a perfume (p_id null, at the end) or edits one. The server passes the
-- picture and rating it just read from p_parfumo_url.
create function public.admin_showcase_save(
  p_id uuid,
  p_brand text,
  p_name text,
  p_concentration text,
  p_parfumo_url text,
  p_image_url text,
  p_rating numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_id is null then
    if (select count(*) from public.showcase) >= 12 then
      raise exception 'carousel is full' using errcode = '54000';
    end if;

    insert into public.showcase (
      position, brand, name, concentration, parfumo_url, image_url, parfumo_rating, parfumo_read_at, updated_by
    )
    values (
      coalesce((select max(position) from public.showcase), 0) + 1,
      trim(p_brand),
      trim(p_name),
      nullif(p_concentration, ''),
      p_parfumo_url,
      p_image_url,
      round(p_rating, 1),
      now(),
      (select auth.uid())
    )
    returning id into v_id;
  else
    update public.showcase
    set
      brand = trim(p_brand),
      name = trim(p_name),
      concentration = nullif(p_concentration, ''),
      parfumo_url = p_parfumo_url,
      image_url = p_image_url,
      parfumo_rating = round(p_rating, 1),
      parfumo_read_at = now(),
      updated_by = (select auth.uid())
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'not in the carousel' using errcode = 'P0002';
    end if;
  end if;

  return v_id;
end;
$$;

create function public.admin_showcase_remove(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.showcase where id = p_id) then
    return;
  end if;
  if (select count(*) from public.showcase) <= 1 then
    raise exception 'carousel needs at least one perfume' using errcode = '23514';
  end if;

  delete from public.showcase where id = p_id;
end;
$$;

-- Swaps a perfume with its neighbour: p_offset < 0 moves it earlier, > 0 later
create function public.admin_showcase_move(p_id uuid, p_offset integer)
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

  select position into v_position from public.showcase where id = p_id;
  if v_position is null then
    raise exception 'not in the carousel' using errcode = 'P0002';
  end if;

  select id, position into v_other_id, v_other_position
  from public.showcase
  where case when p_offset < 0 then position < v_position else position > v_position end
  order by case when p_offset < 0 then -position else position end
  limit 1;

  if v_other_id is null then
    return;
  end if;

  update public.showcase set position = v_other_position where id = p_id;
  update public.showcase set position = v_position where id = v_other_id;
end;
$$;

revoke execute on function public.admin_showcase_save(uuid, text, text, text, text, text, numeric) from public, anon;
revoke execute on function public.admin_showcase_remove(uuid) from public, anon;
revoke execute on function public.admin_showcase_move(uuid, integer) from public, anon;
grant execute on function public.admin_showcase_save(uuid, text, text, text, text, text, numeric) to authenticated;
grant execute on function public.admin_showcase_remove(uuid) to authenticated;
grant execute on function public.admin_showcase_move(uuid, integer) to authenticated;
