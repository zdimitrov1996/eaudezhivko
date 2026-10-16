-- Eau de Fragrances: visitor feedback
-- Run once in Supabase → SQL Editor, after 20261016190000_admin.sql.

-- ---------------------------------------------------------------------------
-- Feedback messages from visitors (signed in or not)
-- ---------------------------------------------------------------------------
create table public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  category text not null check (category in ('idea', 'bug', 'other')),
  message text not null check (char_length(message) between 5 and 2000),
  contact_email text check (char_length(contact_email) <= 254),
  page text check (char_length(page) <= 300),
  locale text check (char_length(locale) <= 10),
  user_agent text check (char_length(user_agent) <= 400),
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now()
);

create index feedback_created_idx on public.feedback (created_at desc);
create index feedback_user_idx on public.feedback (user_id, created_at desc);

-- RLS on and no policies: written by submit_feedback, read by admin functions
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;

-- Anyone can send feedback; light flood protection per user, and for guests overall
create function public.submit_feedback(
  p_category text,
  p_message text,
  p_contact_email text default null,
  p_page text default null,
  p_locale text default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  -- Per 10 minutes: 5 per signed-in user, 20 for all guests together
  v_limit integer := case when v_user_id is null then 20 else 5 end;
  v_recent integer;
begin
  select count(*) into v_recent
  from public.feedback f
  where f.created_at > now() - interval '10 minutes'
    and (
      (v_user_id is not null and f.user_id = v_user_id)
      or (v_user_id is null and f.user_id is null)
    );

  if v_recent >= v_limit then
    raise exception 'too many feedback messages' using errcode = 'P0001', hint = 'rate_limited';
  end if;

  insert into public.feedback (user_id, category, message, contact_email, page, locale, user_agent)
  values (
    v_user_id,
    p_category,
    trim(p_message),
    nullif(trim(p_contact_email), ''),
    left(p_page, 300),
    left(p_locale, 10),
    left(p_user_agent, 400)
  );
end;
$$;

revoke execute on function public.submit_feedback(text, text, text, text, text, text) from public;
grant execute on function public.submit_feedback(text, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin: read feedback and mark it as done
-- ---------------------------------------------------------------------------
create function public.admin_feedback()
returns table (
  id bigint,
  category text,
  message text,
  status text,
  user_id uuid,
  user_email text,
  contact_email text,
  page text,
  locale text,
  user_agent text,
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
  select f.id, f.category, f.message, f.status, f.user_id, u.email::text,
         f.contact_email, f.page, f.locale, f.user_agent, f.created_at
  from public.feedback f
  left join auth.users u on u.id = f.user_id
  order by (f.status = 'new') desc, f.created_at desc
  limit 500;
end;
$$;

create function public.admin_set_feedback_status(p_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.feedback set status = p_status where id = p_id;
end;
$$;

revoke execute on function public.admin_feedback() from public, anon;
revoke execute on function public.admin_set_feedback_status(bigint, text) from public, anon;
grant execute on function public.admin_feedback() to authenticated;
grant execute on function public.admin_set_feedback_status(bigint, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Overview gains a "new feedback" count (return type changes, so recreate)
-- ---------------------------------------------------------------------------
drop function public.admin_overview();

create function public.admin_overview()
returns table (
  total_users integer,
  new_users_7d integer,
  catalog_perfumes integer,
  collection_entries integer,
  wishlist_entries integer,
  ratings_given integer,
  new_feedback integer
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
    (select count(public.user_perfumes.rating) from public.user_perfumes)::integer,
    (select count(*) from public.feedback where public.feedback.status = 'new')::integer;
end;
$$;

revoke execute on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;
