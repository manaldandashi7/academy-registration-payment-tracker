-- ============================================================
-- Security hardening - run once in: Supabase Dashboard -> SQL Editor -> New query
--
-- The app already validates every input, but browser code can be bypassed by
-- anyone who talks to the API directly. These rules make the DATABASE refuse
-- bad data on its own. They are safe to run more than once.
--
-- "not valid" means: enforce for every new or edited row, but do not fail
-- because of rows that already exist. (Optional clean-up at the very bottom.)
-- ============================================================

do $$
begin
  -- ---------------- students ----------------
  if not exists (select 1 from pg_constraint where conname = 'students_name_len') then
    alter table students add constraint students_name_len
      check (char_length(btrim(name)) between 1 and 100) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'students_class_len') then
    alter table students add constraint students_class_len
      check (char_length(btrim(class)) between 1 and 60) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'students_phone_format') then
    alter table students add constraint students_phone_format
      check (phone ~ '^\+?[0-9 ()\-.]{6,25}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'students_enrollment_range') then
    alter table students add constraint students_enrollment_range
      check (enrollment_date between date '2000-01-01' and date '2100-01-01') not valid;
  end if;

  -- ---------------- payments ----------------
  if not exists (select 1 from pg_constraint where conname = 'payments_amount_range') then
    alter table payments add constraint payments_amount_range
      check (amount is null or (amount >= 0 and amount <= 10000000)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_month_len') then
    alter table payments add constraint payments_month_len
      check (month_covered is null or char_length(month_covered) <= 40) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_notes_len') then
    alter table payments add constraint payments_notes_len
      check (notes is null or char_length(notes) <= 500) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_date_range') then
    alter table payments add constraint payments_date_range
      check (date_paid between date '2000-01-01' and date '2100-01-01') not valid;
  end if;

  -- ---------------- settings ----------------
  if not exists (select 1 from pg_constraint where conname = 'settings_name_len') then
    alter table settings add constraint settings_name_len
      check (char_length(btrim(academy_name)) between 1 and 80) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'settings_text_len') then
    alter table settings add constraint settings_text_len
      check (
        coalesce(char_length(address), 0) <= 200
        and coalesce(char_length(phone), 0) <= 25
        and coalesce(char_length(owner_name), 0) <= 80
      ) not valid;
  end if;
end $$;

-- Student address (only if you added that column)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'address'
  ) and not exists (select 1 from pg_constraint where conname = 'students_address_len') then
    alter table students add constraint students_address_len
      check (address is null or char_length(address) <= 200) not valid;
  end if;
end $$;

-- ---------------------------------------------------------------
-- Logo bucket: images only, 2 MB maximum. This is enforced by Supabase
-- Storage itself, so it holds even if someone skips the app entirely.
-- (SVG is excluded on purpose because SVG files can contain scripts.)
-- ---------------------------------------------------------------
update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'logos';

-- ---------------------------------------------------------------
-- OPTIONAL clean-up: once you are happy your existing rows follow the rules,
-- you can make the database check them too. If one of these fails, it names a
-- row that needs fixing first.
--
--   alter table students validate constraint students_name_len;
--   alter table students validate constraint students_class_len;
--   alter table students validate constraint students_phone_format;
--   alter table students validate constraint students_enrollment_range;
--   alter table payments validate constraint payments_amount_range;
--   alter table payments validate constraint payments_month_len;
--   alter table payments validate constraint payments_notes_len;
--   alter table payments validate constraint payments_date_range;
-- ---------------------------------------------------------------
