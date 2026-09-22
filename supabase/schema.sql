-- ============================================================
-- Academy Payment Tracker - Supabase schema
-- Run this once in: Supabase Dashboard -> SQL Editor -> New query
--
-- IMPORTANT: this base schema alone lets every signed-in user see and edit
-- every academy's data (see the "staff full access" policies below). After
-- running this, also run multi_academy.sql in the same project so each
-- academy's sign-up only ever sees its own data. Then run expenses.sql to add
-- expense tracking, and, optionally, security_hardening.sql for extra input
-- checks at the database level.
-- ============================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,               -- WhatsApp number, international format e.g. +9613xxxxxx
  class text not null,
  address text,                      -- optional home address
  level int not null check (level between 1 and 4),
  enrollment_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  level int not null,
  date_paid date not null,
  amount numeric,
  month_covered text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id text primary key default 'general',
  academy_name text not null default 'Your Academy',
  logo_url text,
  address text,
  phone text,
  owner_name text
);

insert into settings (id, academy_name, address, phone, owner_name)
values ('general', 'Your Academy', '', '', '')
on conflict (id) do nothing;

alter table settings add column if not exists address text;
alter table settings add column if not exists phone text;
alter table settings add column if not exists owner_name text;

-- Existing databases: add the optional student address column
alter table students add column if not exists address text;

-- Helpful indexes
create index if not exists idx_students_level on students(level);
create index if not exists idx_payments_student on payments(student_id);
create index if not exists idx_payments_date on payments(date_paid);

-- ---------------------------------------------------------------
-- Row Level Security
-- Only signed-in staff (any authenticated Supabase user) can read
-- or write. There is no public signup flow in the app - create staff
-- accounts yourself in Authentication -> Users in the dashboard.
-- ---------------------------------------------------------------

alter table students enable row level security;
alter table payments enable row level security;
alter table settings enable row level security;

create policy "staff full access - students"
  on students for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "staff full access - payments"
  on payments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "staff full access - settings"
  on settings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- Storage bucket for the academy logo (public read, staff write)
-- ---------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "public read - logos"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "staff write - logos"
  on storage.objects for insert
  with check (bucket_id = 'logos' and auth.role() = 'authenticated');

create policy "staff update - logos"
  on storage.objects for update
  using (bucket_id = 'logos' and auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- Realtime: let the app subscribe to live changes
-- ---------------------------------------------------------------

alter publication supabase_realtime add table students;
alter publication supabase_realtime add table payments;
alter publication supabase_realtime add table settings;

-- ---------------------------------------------------------------
-- Helper function: check whether an email is already registered
-- Safe to call from the frontend because it runs in Postgres and
-- does not expose auth users directly to the browser.
-- ---------------------------------------------------------------
create or replace function public.is_email_available(email_input text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if email_input is null or trim(email_input) = '' then
    return false;
  end if;

  return not exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(email_input))
  );
end;
$$;

grant execute on function public.is_email_available(text) to anon, authenticated;
