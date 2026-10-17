-- Eau de Fragrances: Fragrantica and Parfumo ratings, entered by users
-- Run once in Supabase → SQL Editor, after 20261016200000_feedback.sql.
--
-- Neither site offers an API and we don't scrape them, so people type in the
-- rating they see. Fragrantica rates out of 5, Parfumo out of 10.

alter table public.perfumes
  add column fragrantica_rating numeric(3, 2) check (fragrantica_rating between 0 and 5),
  add column parfumo_rating numeric(3, 1) check (parfumo_rating between 0 and 10),
  add column ratings_updated_at timestamptz,
  add column ratings_updated_by uuid references auth.users (id) on delete set null;

-- Any signed-in user may set or update a perfume's ratings (they are shared,
-- like the rest of the catalogue). A null argument keeps the current value.
create function public.set_external_ratings(
  p_perfume_id uuid,
  p_fragrantica_rating numeric,
  p_parfumo_rating numeric
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
  if p_fragrantica_rating is null and p_parfumo_rating is null then
    return;
  end if;

  update public.perfumes
  set
    fragrantica_rating = coalesce(round(p_fragrantica_rating, 2), fragrantica_rating),
    parfumo_rating = coalesce(round(p_parfumo_rating, 1), parfumo_rating),
    ratings_updated_at = now(),
    ratings_updated_by = (select auth.uid())
  where id = p_perfume_id;
end;
$$;

revoke execute on function public.set_external_ratings(uuid, numeric, numeric) from public, anon;
grant execute on function public.set_external_ratings(uuid, numeric, numeric) to authenticated;
