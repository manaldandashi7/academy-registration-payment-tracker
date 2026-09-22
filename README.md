# Academy Payment Tracker

A React + Vite web app for tracking after-school academy students, rolling
monthly payments, expenses, and income — backed by Supabase (Postgres + Auth
+ Storage). Multi-tenant: anyone can sign up and gets their own isolated
academy, with no visibility into anyone else's data. Bilingual, Arabic and
English, with full right-to-left layout.

## Features

- Sign-up is self-serve — each new account is its own separate academy.
  Data isolation is enforced by the database itself (Row Level Security),
  not just the app's screens.
- Dashboard: overdue / due-soon / paid-up counts, sorted "needs attention" list
- Level 1–4 pages: roster, add/edit/archive/permanently delete students
- Archived students have their own screen (Settings → Archived) to restore
  or permanently delete them — archiving alone doesn't surface them anywhere
- Record payment → automatically pushes that student's next due date
  forward a month
- One-click WhatsApp reminders (`wa.me` links — no API keys, no approval
  process); the message always renders in Arabic for the parent, regardless
  of which language the staff member has the interface set to
- Expenses: log salaries, rent, utilities, supplies, maintenance, or other
  costs, with a monthly trend and category filtering
- Income report: totals broken down by level, plus Net (income − expenses)
  per month
- Logo + academy name upload, shown everywhere in the app
- Realtime: multiple staff members see the same data update live
- Arabic / English toggle with full RTL layout, persisted per browser
- Every form is validated and sanitised against bad/malicious input on both
  the client and the database (see `supabase/security_hardening.sql`); run
  `node --test tests/security.test.mjs` to check it yourself

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In **SQL Editor**, run these files **in this order** (each is a one-time
   script — safe to re-run if you're ever unsure whether it went through):
   1. `supabase/schema.sql` — creates the `students`, `payments`, and
      `settings` tables and a public `logos` storage bucket.
   2. `supabase/multi_academy.sql` — the multi-tenant piece: tags every row
      with the academy that owns it and rewrites the database's access
      rules so one academy can never see another's data. Do this before
      real academies start signing up.
   3. `supabase/expenses.sql` — adds the `expenses` table.
   4. `supabase/security_hardening.sql` (optional but recommended) — extra
      database-level checks (length limits, valid ranges) as defence in
      depth behind the app's own input validation.
3. In **Authentication → URL Configuration**, set the **Site URL** and add
   it under **Redirect URLs** — this is what makes sign-up confirmation and
   password-reset email links point at your actual site instead of
   `localhost`. Update this again after you deploy (step 4).
4. In **Project Settings → API**, copy your **Project URL** and **anon
   public key**.

Note: new Supabase projects use a shared, rate-limited email sender that's
meant for testing, not real use — confirmation emails can be slow, land in
spam, or get rate-limited. Before relying on this for real sign-ups, set up
your own sender under **Authentication → Settings → SMTP Settings**
(Supabase's docs walk through [Resend](https://resend.com), which has a
generous free tier).

## 2. Configure the app

```bash
cp .env.example .env.local
```

Edit `.env.local` and paste in your Project URL and anon key.

## 3. Install and run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The first time
you sign up, you'll be asked for your academy's name and logo before
landing on the dashboard.

## 4. Deploy

This is a static Vite build, so it deploys anywhere that serves static
files:

```bash
npm run build
```

This outputs to `dist/`. Push it to Vercel, Netlify, Cloudflare Pages, or
any static host:

- Set the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as
  environment variables on the host — Vite bakes them in at build time.
- Update Supabase's **Site URL** / **Redirect URLs** (see step 1.3 above) to
  your new live URL, or sign-up confirmation and password-reset emails will
  still point at `localhost`.
- No server-side routing configuration is needed — navigation uses the
  URL's `#` fragment rather than real routes, so a plain static host works
  with zero extra config.

### Keeping a free-tier Supabase project awake

Supabase's free tier automatically pauses a project after 7 days with no
API activity, which would make the live site show connection errors until
someone manually resumes it from the Supabase dashboard. `.github/workflows/
keep-supabase-awake.yml` pings the project weekly to prevent that — add
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as **repository secrets**
(Settings → Secrets and variables → Actions) to activate it; it's inert
without them.

## Notes

- Phone numbers should be saved in international format (e.g. `+9613xxxxxx`)
  for the WhatsApp links to work correctly.
- "Archive" hides a student from the active lists without deleting their
  payment history; "Delete" (available both on a student's row menu and
  from Settings → Archived) is permanent and takes their payment records
  with it.
- Payment due dates are calculated as one month after the last recorded
  payment (or one month after enrollment, if they've never paid) — this is
  what makes rolling, staggered enrollment dates work correctly per student.
- The income report sums the `amount` field on recorded payments, grouped by
  the month the payment was actually made (`date_paid`), not the month it
  covers — so it reflects real cash received each month.
- Data isolation between academies relies on `multi_academy.sql` having
  been run. Without it, the base schema alone lets any signed-in user see
  every academy's data.
