-- ============================================================
-- Expenses (money going out) - run once in: Supabase Dashboard -> SQL Editor -> New query
--
-- Adds a table for the academy's outgoing costs - teacher salaries, rent,
-- utilities, supplies, maintenance, anything else - alongside the existing
-- students/payments/settings tables. Scoped and protected the same way those
-- are (see multi_academy.sql): every row is tagged with the academy that
-- created it, and the database only ever lets that academy see or touch its
-- own rows.
--
-- Run multi_academy.sql first if you haven't already - this reuses the same
-- academy-isolation pattern it set up.
-- Safe to run more than once.
-- ============================================================

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('salary', 'rent', 'utilities', 'supplies', 'maintenance', 'other')),
  payee text,                        -- who/what this is for, e.g. a teacher's name or "September rent"
  amount numeric not null check (amount >= 0 and amount <= 10000000),
  date_paid date not null check (date_paid between date '2000-01-01' and date '2100-01-01'),
  notes text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'expenses_payee_len') then
    alter table expenses add constraint expenses_payee_len check (payee is null or char_length(payee) <= 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'expenses_notes_len') then
    alter table expenses add constraint expenses_notes_len check (notes is null or char_length(notes) <= 500);
  end if;
end $$;

create index if not exists idx_expenses_academy on expenses(academy_id);
create index if not exists idx_expenses_date on expenses(date_paid);

alter table expenses enable row level security;

drop policy if exists "academy isolation - expenses" on expenses;
create policy "academy isolation - expenses"
  on expenses for all
  using (academy_id = auth.uid())
  with check (academy_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expenses'
  ) then
    alter publication supabase_realtime add table expenses;
  end if;
end $$;
