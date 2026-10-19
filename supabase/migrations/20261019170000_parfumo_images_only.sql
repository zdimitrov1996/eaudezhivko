-- Eau de Fragrances: catalogue bottle pictures must come from Parfumo.
-- Run once in Supabase → SQL Editor, after 20261019160000_showcase_own_entries.sql.
--
-- Signed-in users can write image_url directly (on entries they added) or
-- through set_parfumo_data (on any entry), so the database itself keeps it to
-- a Parfumo picture or the "no picture" marker. Anything else is cleared and
-- read again from Parfumo on the next visit.

update public.perfumes
set image_url = null, ratings_updated_at = null
where image_url <> 'https://parfumo.com/no-image'
  and image_url !~ '^https://([a-z0-9-]+\.)?parfumo\.[a-z.]{2,6}/';

alter table public.perfumes drop constraint perfumes_image_url_check;
alter table public.perfumes add constraint perfumes_image_url_check check (
  image_url = 'https://parfumo.com/no-image'
  or image_url ~ '^https://([a-z0-9-]+\.)?parfumo\.[a-z.]{2,6}/'
);
