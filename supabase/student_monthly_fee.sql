-- ============================================================
-- Student monthly fee - run once in: Supabase Dashboard -> SQL Editor -> New query
--
-- Adds an optional "expected monthly payment" amount per student, set at
-- enrollment (or added later for existing students). The app uses it to
-- pre-fill the amount when recording that student's payment, so staff don't
-- have to remember or retype it each month.
--
-- Safe to run more than once.
-- ============================================================

alter table students add column if not exists monthly_fee numeric;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'students_monthly_fee_range') then
    alter table students add constraint students_monthly_fee_range
      check (monthly_fee is null or (monthly_fee >= 0 and monthly_fee <= 10000000));
  end if;
end $$;
