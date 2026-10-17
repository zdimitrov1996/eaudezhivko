-- Eau de Fragrances: Parfumo notes, read automatically with the rating
-- Run once in Supabase → SQL Editor, after 20261017100000_external_ratings.sql.
--
-- parfumo_notes holds the note pyramid from the perfume's Parfumo page:
-- {"top": [...], "heart": [...], "base": [...]} or {"notes": [...]} for
-- perfumes Parfumo lists without a pyramid.

alter table public.perfumes
  add column parfumo_notes jsonb check (
    parfumo_notes is null
    or (jsonb_typeof(parfumo_notes) = 'object' and octet_length(parfumo_notes::text) <= 8000)
  );

-- Saves what the server read from Parfumo. Any signed-in user's visit can
-- trigger it (the catalogue is shared). A null argument keeps the old value.
create function public.set_parfumo_data(
  p_perfume_id uuid,
  p_rating numeric,
  p_notes jsonb
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
    ratings_updated_at = now(),
    ratings_updated_by = (select auth.uid())
  where id = p_perfume_id;
end;
$$;

revoke execute on function public.set_parfumo_data(uuid, numeric, jsonb) from public, anon;
grant execute on function public.set_parfumo_data(uuid, numeric, jsonb) to authenticated;
