-- ============================================================
-- Academy Payment Tracker - Supabase schema
-- Run this once in: Supabase Dashboard -> SQL Editor -> New query
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
  logo_url text
);

insert into settings (id, academy_name)
values ('general', 'Your Academy')
on conflict (id) do nothing;

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
