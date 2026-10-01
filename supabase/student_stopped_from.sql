-- ============================================================
-- Archived students: "stopped from" date - run once in:
-- Supabase Dashboard -> SQL Editor -> New query
--
-- When a student is archived, staff choose the date from which their monthly
-- fee is no longer expected (pre-filled with their first unpaid renewal).
-- The Monthly balance counts the student only in months whose renewal falls
-- before that date, so archiving someone never changes past months.
-- Restoring the student clears it again.
--
-- Safe to run more than once.
-- ============================================================

alter table students add column if not exists stopped_from date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'students_stopped_from_range') then
    alter table students add constraint students_stopped_from_range
      check (stopped_from is null or stopped_from between date '2000-01-01' and date '2100-01-01');
  end if;
end $$;
