-- Eau de Fragrances: Parfumo links that lead to no perfume are removed.
-- Run once in Supabase -> SQL Editor, after 20261019170000_parfumo_images_only.sql
-- and before merging the PR that brings it.
--
-- For an address with an unknown perfume under a real brand, Parfumo shows a
-- random perfume, a different one on every visit, and the site used to read
-- that page's rating, notes and picture into the catalogue. The server now
-- checks a link before saving it; when a saved link turns out to lead nowhere,
-- it removes the link and what was read from it with the function below.
--
-- Like set_parfumo_data, any signed-in user may call it: the server decides
-- when a link is gone. It only removes the link it was given, so one fixed in
-- the meantime stays, and anyone can add a link again from the perfume's card.

create function public.remove_missing_parfumo_link(p_perfume_id uuid, p_parfumo_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  update public.perfumes
  set
    parfumo_url = null,
    parfumo_rating = null,
    parfumo_notes = null,
    image_url = null,
    ratings_updated_at = now(),
    ratings_updated_by = (select auth.uid())
  where id = p_perfume_id
    and parfumo_url = p_parfumo_url;
end;
$$;

revoke execute on function public.remove_missing_parfumo_link(uuid, text) from public, anon;
grant execute on function public.remove_missing_parfumo_link(uuid, text) to authenticated;

-- Read every saved link again on the next visit to a shelf that has it, so
-- broken ones go now rather than within a week.
update public.perfumes
set ratings_updated_at = null
where parfumo_url is not null;
