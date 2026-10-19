-- Eau de Fragrances: catalogue bottle pictures must come from Parfumo, and
-- two names garbled on the way into Supabase are repaired.
-- Run once in Supabase -> SQL Editor, after 20261019160000_showcase_own_entries.sql.
-- This file is plain ASCII on purpose (see the second part).

-- ---------------------------------------------------------------------------
-- Pictures: signed-in users can write image_url directly (on entries they
-- added) or through set_parfumo_data (on any entry), so the database itself
-- keeps it to a Parfumo picture or the "no picture" marker. Anything else is
-- cleared and read again from Parfumo on the next visit.
-- ---------------------------------------------------------------------------
update public.perfumes
set image_url = null, ratings_updated_at = null
where image_url <> 'https://parfumo.com/no-image'
  and image_url !~ '^https://([a-z0-9-]+\.)?parfumo\.[a-z.]{2,6}/';

alter table public.perfumes drop constraint perfumes_image_url_check;
alter table public.perfumes add constraint perfumes_image_url_check check (
  image_url = 'https://parfumo.com/no-image'
  or image_url ~ '^https://([a-z0-9-]+\.)?parfumo\.[a-z.]{2,6}/'
);

-- ---------------------------------------------------------------------------
-- Names: 20261019120000 reached the SQL Editor through a clipboard that read
-- it as Mac Roman, so each non-ASCII letter turned into two: the o-circumflex
-- of Lancome into U+221A U+00A5, the degree sign of "N 5" into U+00AC U+221E.
-- U&'' escapes keep these fixes ASCII. A catalogue entry that would collide
-- with a correct one is left alone.
-- ---------------------------------------------------------------------------
update public.perfumes p
set brand = U&'Lanc\00F4me'
where p.brand = U&'Lanc\221A\00A5me'
  and not exists (
    select 1 from public.perfumes q
    where lower(q.brand) = lower(U&'Lanc\00F4me')
      and lower(q.name) = lower(p.name)
      and coalesce(q.concentration, '') = coalesce(p.concentration, '')
  );

update public.perfumes p
set name = U&'N\00B05'
where p.name = U&'N\00AC\221E5'
  and not exists (
    select 1 from public.perfumes q
    where lower(q.brand) = lower(p.brand)
      and lower(q.name) = lower(U&'N\00B05')
      and coalesce(q.concentration, '') = coalesce(p.concentration, '')
  );

update public.showcase set brand = U&'Lanc\00F4me' where brand = U&'Lanc\221A\00A5me';
update public.showcase set name = U&'N\00B05' where name = U&'N\00AC\221E5';
