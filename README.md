# Job Quickie

Live job-market monitor built with Next.js. Aggregates remote, hybrid and
on-site openings in real time from four public sources — Remotive, Jobicy,
Arbeitnow and The Muse — behind an approval-based login.

## Features

- Server-side job aggregation (no browser CORS issues) with 10-minute caching and de-duplication
- Remote / Hybrid / On-site tabs, full-text search, category filters (AI & ML, Healthcare & Nursing, PhD & Research, Internships, and more)
- Email + password authentication with signed httpOnly session cookies
- Admin approval flow: new signups are held as "pending" until the administrator approves them
- Admin panel to approve or reject access requests
- 3D rotating globe (Three.js) on the landing page

## Getting started

```bash
npm install
cp .env.example .env   # then edit .env
npm run dev            # http://localhost:3000
```

Set in `.env`:

- `AUTH_SECRET` — a long random string (e.g. `openssl rand -hex 32`)
- `ADMIN_EMAIL` — the email that becomes the auto-approved administrator

Sign up with `ADMIN_EMAIL` first; that account is auto-approved with the
admin role and can approve everyone else at `/admin`.

## Production

```bash
npm run build
npm start
```

Deploy anywhere that runs a persistent Node server (Render, Railway,
Fly.io, a VPS). Note: users are stored in `data/users.json` on disk, so
serverless hosts with ephemeral filesystems (e.g. Vercel) will not persist
accounts between deploys — swap `lib/db.js` for a database (Postgres,
SQLite, Vercel KV) before deploying there.

## Structure

```
app/
  page.js              Landing — 3D globe + sign in / request access
  dashboard/page.js    Live jobs dashboard (approved users)
  admin/page.js        Admin panel — approve/reject users
  pending/page.js      Shown to users awaiting approval
  api/jobs             Aggregated jobs endpoint (auth required)
  api/auth/*           signup / login / logout
  api/admin/users      List and moderate users (admin only)
components/Globe.js    Three.js rotating earth
lib/jobs.js            Source fetchers + cache
lib/db.js              File-backed user store
lib/auth.js            JWT session helpers
middleware.js          Route protection
```
