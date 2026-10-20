-- Eau de Fragrances: admins can delete a feedback message for good.
-- Run once in Supabase -> SQL Editor, after 20261020120000_missing_parfumo_links.sql
-- and before merging the PR that brings it.

create function public.admin_delete_feedback(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  delete from public.feedback where id = p_id;
end;
$$;

revoke execute on function public.admin_delete_feedback(bigint) from public, anon;
grant execute on function public.admin_delete_feedback(bigint) to authenticated;
