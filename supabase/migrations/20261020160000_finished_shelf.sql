-- Eau de Fragrances: how full each bottle in a collection is, and a
-- "finished" shelf for bottles that reached 0%.
-- Run once in Supabase -> SQL Editor, after 20261020140000_feedback_delete.sql
-- and before merging the PR that brings it.

-- A third shelf. Postgres lets a new enum value be used only once this change
-- is committed, so nothing below mentions it.
alter type public.shelf add value if not exists 'finished';

-- How full the bottle is, in steps of 10% (null: not set). The app keeps it
-- on collection bottles only: 0% moves the bottle to "finished", and moving a
-- bottle to another shelf clears it. Rows are the user's own (RLS as before).
alter table public.user_perfumes
  add column fill_level smallint check (fill_level between 0 and 100 and fill_level % 10 = 0);
