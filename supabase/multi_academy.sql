-- ============================================================
-- Multi-academy isolation - run once in: Supabase Dashboard -> SQL Editor -> New query
--
-- Right now every signed-in user can read and write every academy's data (see
-- schema.sql's "staff full access" policies). This script gives every academy
-- its own private space: each student, payment and settings row is tagged
-- with the account that owns it, and the database is told to only ever let
-- that account see or touch its own rows - not the app's screens, the
-- database itself, so it can't be bypassed by calling the API directly.
--
-- Safe to run more than once. Written to be additive: nothing is dropped
-- except the three old "anyone signed in can see everything" policies, which
-- are replaced by scoped ones in the same statement.
-- ============================================================

-- ---------------------------------------------------------------
-- 1. Add an owner column to each table
-- ---------------------------------------------------------------
alter table students add column if not exists academy_id uuid references auth.users(id) on delete cascade;
alter table payments add column if not exists academy_id uuid references auth.users(id) on delete cascade;
alter table settings add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- ---------------------------------------------------------------
-- 2. Assign existing rows to their owner.
-- This only auto-assigns when there is exactly one user account, which is
-- the safe, unambiguous case. With more than one account already, it stops
-- and tells you so nothing gets assigned to the wrong academy by accident -
-- assign those rows by hand first (see the note in the error).
-- ---------------------------------------------------------------
do $$
declare
  owner uuid;
  user_count int;
begin
  select count(*) into user_count from auth.users;

  if user_count = 0 then
    return; -- nothing to assign yet
  end if;

  if user_count > 1 and exists (
    select 1 from students where academy_id is null
    union all select 1 from payments where academy_id is null
    union all select 1 from settings where owner_id is null
  ) then
    raise exception
      'Found % user accounts but some rows have no owner yet. Assign them manually first, e.g.: '
      'update students set academy_id = ''<uid>'' where academy_id is null; '
      '(find each <uid> under Authentication -> Users)', user_count;
  end if;

  select id into owner from auth.users limit 1;
  update students set academy_id = owner where academy_id is null;
  update payments set academy_id = owner where academy_id is null;
  update settings set owner_id = owner where owner_id is null;
end $$;

-- ---------------------------------------------------------------
-- 3. Make the owner column required, and default to the caller for new rows.
-- (The app never needs to set this itself - the database fills it in from
-- whoever is signed in, and the "with check" rule below stops it being
-- switched to anyone else's id.)
-- ---------------------------------------------------------------
alter table students alter column academy_id set not null;
alter table payments alter column academy_id set not null;
alter table settings alter column owner_id set not null;

alter table students alter column academy_id set default auth.uid();
alter table payments alter column academy_id set default auth.uid();
alter table settings alter column owner_id set default auth.uid();

-- One settings row per academy. (The old primary key "id" column is left in
-- place untouched; its default changes below so a second academy's first
-- save doesn't collide with the first academy's row.)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'settings_owner_unique') then
    alter table settings add constraint settings_owner_unique unique (owner_id);
  end if;
end $$;
alter table settings alter column id set default gen_random_uuid()::text;

create index if not exists idx_students_academy on students(academy_id);
create index if not exists idx_payments_academy on payments(academy_id);

-- ---------------------------------------------------------------
-- 4. Replace the old "any signed-in user, full access" rules with rules
-- scoped to the caller's own academy_id / owner_id.
-- ---------------------------------------------------------------
drop policy if exists "staff full access - students" on students;
create policy "academy isolation - students"
  on students for all
  using (academy_id = auth.uid())
  with check (academy_id = auth.uid());

drop policy if exists "staff full access - payments" on payments;
create policy "academy isolation - payments"
  on payments for all
  using (academy_id = auth.uid())
  with check (academy_id = auth.uid());

drop policy if exists "staff full access - settings" on settings;
create policy "academy isolation - settings"
  on settings for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------
-- 5. Logo storage: scope uploads/updates/deletes to a folder named after the
-- owner's account id, e.g. "<uid>/academy-logo-....png", so one academy can't
-- overwrite or delete another's logo. Reading a logo stays public - that's
-- needed so the logo shows on the welcome screen before anyone signs in.
-- ---------------------------------------------------------------
drop policy if exists "staff write - logos" on storage.objects;
create policy "staff write - logos"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "staff update - logos" on storage.objects;
create policy "staff update - logos"
  on storage.objects for update
  using (
    bucket_id = 'logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- There was previously no delete policy at all for logos, so the "remove old
-- logo" step in account deletion has always silently failed. Add one, scoped
-- the same way.
drop policy if exists "staff delete - logos" on storage.objects;
create policy "staff delete - logos"
  on storage.objects for delete
  using (
    bucket_id = 'logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------
-- Verify (optional): run these after to sanity-check the result.
--   select id, academy_id from students;
--   select id, owner_id, academy_name from settings;
--   select policyname, cmd, qual from pg_policies where tablename in ('students','payments','settings');
-- ---------------------------------------------------------------
