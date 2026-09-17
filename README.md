# Academy Payment Tracker

A React + Vite web app for tracking after-school academy students, rolling
monthly payments, and income — backed by Supabase (Postgres + Auth + Storage).

## Features

- Staff sign-in (Supabase Auth, no public signup)
- Dashboard: overdue / due-soon / paid-up counts, sorted "needs attention" list
- Level 1–4 pages: roster, add/edit/archive students
- Record payment -> automatically pushes that student's next due date forward a month
- One-click WhatsApp reminders (`wa.me` links — no API keys, no approval process)
- Logo + academy name upload, shown everywhere in the app
- Monthly income report, totalled and broken down by level
- Realtime: multiple staff members see the same data update live

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In **SQL Editor**, paste and run the contents of `supabase/schema.sql`.
   This creates the `students`, `payments`, and `settings` tables, row-level
   security policies (only signed-in staff can read/write), and a public
   `logos` storage bucket.
3. In **Authentication → Users**, add one user per staff member (email +
   password). There's no public signup screen in the app on purpose.
4. In **Project Settings → API**, copy your **Project URL** and **anon public
   key**.

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

Open the URL Vite prints (usually `http://localhost:5173`), sign in with a
staff account you created in Supabase, and you're in.

## 4. Deploy

This is a static Vite build, so it deploys anywhere that serves static files:

```bash
npm run build
```

This outputs to `dist/`. Push it to Vercel, Netlify, Cloudflare Pages, or any
static host — just remember to set the same `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` as environment variables on the host, since Vite
bakes them in at build time.

## Notes

- Phone numbers should be saved in international format (e.g. `+9613xxxxxx`)
  for the WhatsApp links to work correctly.
- "Archive" hides a student from the active lists without deleting their
  payment history.
- Payment due dates are calculated as one month after the last recorded
  payment (or one month after enrollment, if they've never paid) — this is
  what makes rolling, staggered enrollment dates work correctly per student.
- The income report sums the `amount` field on recorded payments, grouped by
  the month the payment was actually made (`date_paid`), not the month it
  covers — so it reflects real cash received each month.
