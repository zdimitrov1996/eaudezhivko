-- Eau de Fragrances: feedback gets an "in progress" status and a note on what
-- was done, and its author is told through a new notifications list.
-- Run once in Supabase -> SQL Editor, after 20261020160000_finished_shelf.sql
-- and before merging the PR that brings it.

-- ---------------------------------------------------------------------------
-- Feedback: new / in_progress / done, and what was done
-- ---------------------------------------------------------------------------
alter table public.feedback drop constraint feedback_status_check;
alter table public.feedback add constraint feedback_status_check
  check (status in ('new', 'in_progress', 'done'));
alter table public.feedback add column resolution_note text
  check (char_length(resolution_note) <= 1000);

-- ---------------------------------------------------------------------------
-- Notifications: written only by admin functions, read by their recipient
-- ---------------------------------------------------------------------------
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  feedback_id bigint references public.feedback (id) on delete set null,
  kind text not null check (kind in ('feedback_in_progress', 'feedback_done')),
  -- The start of the feedback, so the user knows which message it's about
  feedback_excerpt text check (char_length(feedback_excerpt) <= 300),
  -- What was done, written by the admin (feedback_done only)
  message text check (char_length(message) <= 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;

create policy "Users read their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Marks all of the signed-in user's notifications as read
create function public.mark_notifications_read()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  update public.notifications
  set read_at = now()
  where user_id = (select auth.uid()) and read_at is null;
end;
$$;

revoke execute on function public.mark_notifications_read() from public, anon;
grant execute on function public.mark_notifications_read() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: set a status; moving to in_progress or done notifies a signed-in author
-- ---------------------------------------------------------------------------
drop function public.admin_set_feedback_status(bigint, text);

create function public.admin_set_feedback_status(p_id bigint, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := left(nullif(trim(p_note), ''), 1000);
  v_old_status text;
  v_user_id uuid;
  v_message text;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('new', 'in_progress', 'done') then
    raise exception 'unknown status' using errcode = '22023';
  end if;
  if p_status = 'done' and v_note is null then
    raise exception 'say what was done' using errcode = '22023', hint = 'note_required';
  end if;

  select f.status, f.user_id, f.message into v_old_status, v_user_id, v_message
  from public.feedback f
  where f.id = p_id
  for update;
  if not found then
    raise exception 'feedback not found' using errcode = 'P0002';
  end if;

  update public.feedback
  set status = p_status,
      resolution_note = coalesce(v_note, resolution_note)
  where id = p_id;

  -- Only a real change is announced, and guests have no account to tell
  if v_user_id is not null and p_status <> v_old_status and p_status <> 'new' then
    insert into public.notifications (user_id, feedback_id, kind, feedback_excerpt, message)
    values (v_user_id, p_id, 'feedback_' || p_status, left(v_message, 300), v_note);
  end if;
end;
$$;

revoke execute on function public.admin_set_feedback_status(bigint, text, text) from public, anon;
grant execute on function public.admin_set_feedback_status(bigint, text, text) to authenticated;

-- admin_feedback gains the note; new first, then in progress, then done
drop function public.admin_feedback();

create function public.admin_feedback()
returns table (
  id bigint,
  category text,
  message text,
  status text,
  resolution_note text,
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
  select f.id, f.category, f.message, f.status, f.resolution_note, f.user_id, u.email::text,
         f.contact_email, f.page, f.locale, f.user_agent, f.created_at
  from public.feedback f
  left join auth.users u on u.id = f.user_id
  order by array_position(array['new', 'in_progress', 'done'], f.status), f.created_at desc
  limit 500;
end;
$$;

revoke execute on function public.admin_feedback() from public, anon;
grant execute on function public.admin_feedback() to authenticated;
