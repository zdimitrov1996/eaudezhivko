-- Eau de Fragrances: perfume bottle image URL from Parfumo
-- Run once in Supabase → SQL Editor, after 20261017140000_parfumo_notes.sql.

alter table public.perfumes
  add column if not exists image_url text check (
    image_url is null or image_url ~ '^https?://'
  );

-- Replace the previous 3-parameter overload with a 4-parameter version
drop function if exists public.set_parfumo_data(uuid, numeric, jsonb);

create or replace function public.set_parfumo_data(
  p_perfume_id uuid,
  p_rating numeric,
  p_notes jsonb,
  p_image_url text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_rating is not null and (p_rating < 0 or p_rating > 10) then
    raise exception 'rating out of range' using errcode = '22003';
  end if;

  update public.perfumes
  set
    parfumo_rating = coalesce(round(p_rating, 1), parfumo_rating),
    parfumo_notes = coalesce(p_notes, parfumo_notes),
    image_url = coalesce(p_image_url, image_url),
    ratings_updated_at = now(),
    ratings_updated_by = (select auth.uid())
  where id = p_perfume_id;
end;
$$;

revoke execute on function public.set_parfumo_data(uuid, numeric, jsonb, text) from public, anon;
grant execute on function public.set_parfumo_data(uuid, numeric, jsonb, text) to authenticated;

-- Reset ratings_updated_at for perfumes that already have a Parfumo link but no image,
-- so the background refresher re-reads them on the user's next visit.
update public.perfumes
set ratings_updated_at = null
where parfumo_url is not null and image_url is null;
