# Crypto Command Center

This repo implements the Week 4 "Build and Deploy a System" assignment as a
live crypto watchlist.

Architecture:

- `apps/web`: Next.js + Tailwind frontend deployed to Vercel
- `apps/worker`: polling worker deployed to Railway
- `db/schema.sql`: Supabase schema, RLS policies, RPC, and seed assets
- `CLAUDE.md`: assignment architecture write-up

## Product

`Crypto Command Center` lets a signed-in user build a personal watchlist of
crypto assets and monitor live market snapshots without refreshing the page.
The worker polls public Coinbase pricing endpoints, writes normalized market
rows into Supabase, and the frontend subscribes to those updates through
Supabase Realtime.

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Copy these values from `Settings -> API`:

- Project URL
- Anon public key
- Service role key

### 3. Create local env files

Copy the examples:

```bash
copy .env.example .env.local
copy apps\web\.env.example apps\web\.env.local
copy apps\worker\.env.example apps\worker\.env.local
```

Fill them with your Supabase values.

`C:\Users\16823\Documents\0 - And So It Begins\AA - FInal Quarter\Design Build Ship\Assignment 4\.env.local`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COINBASE_API_BASE_URL`
- `POLL_INTERVAL_MS`

`C:\Users\16823\Documents\0 - And So It Begins\AA - FInal Quarter\Design Build Ship\Assignment 4\apps\web\.env.local`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

`C:\Users\16823\Documents\0 - And So It Begins\AA - FInal Quarter\Design Build Ship\Assignment 4\apps\worker\.env.local`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COINBASE_API_BASE_URL`
- `POLL_INTERVAL_MS`

The worker loads env values from either the repo root or
`apps/worker/.env.local`.

### 4. Run the database schema

Open the Supabase SQL editor and run:

`C:\Users\16823\Documents\0 - And So It Begins\AA - FInal Quarter\Design Build Ship\Assignment 4\db\schema.sql`

This creates:

- `assets`
- `market_snapshots`
- `user_watchlist_assets`
- `latest_market_for_my_watchlist()`
- RLS policies
- seed assets like BTC, ETH, SOL, XRP, ADA, DOGE, LINK, and AVAX

Important:

- if you already ran the old weather schema, rerun this file to switch the
  project to crypto
- this schema drops the old weather tables before creating the crypto ones

### 5. Confirm Realtime is enabled

The schema adds `public.market_snapshots` to the `supabase_realtime`
publication. In Supabase, confirm Realtime is enabled for that table.

### 6. Configure Auth

In `Authentication -> URL Configuration`:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

In `Authentication -> Providers -> Email`:

- enable Email / magic link sign-in

### 7. Run locally

Frontend:

```bash
npm.cmd run dev:web
```

Worker:

```bash
npm.cmd run dev:worker
```

### 8. Test the flow

1. Open `http://localhost:3000`
2. Sign in with your email magic link
3. Add assets to your watchlist
4. Watch the worker log fresh market updates
5. Confirm rows appear in `market_snapshots`
6. Confirm the dashboard updates live without a page reload

## Deployment

### Vercel

Set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Then add your Vercel auth URLs back in Supabase:

- `https://your-vercel-app.vercel.app`
- `https://your-vercel-app.vercel.app/auth/callback`

### Railway

This worker is now prepared for Railway with config-as-code in
`apps/worker/railway.json`.

Recommended Railway flow:

1. Push this project to its own GitHub repo
2. In Railway, create a new project from that GitHub repo
3. If Railway auto-detects the monorepo packages, select the worker service
4. If it does not, create one service and set its root directory to `/apps/worker`
5. Confirm the service is using:
   - build command: `npm run build`
   - start command: `npm run start`

Set these variables in the Railway worker service:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COINBASE_API_BASE_URL=https://api.coinbase.com/v2/prices`
- `POLL_INTERVAL_MS=20000`

After Railway deploys, open the deployment logs and confirm you see:

- `Worker started.`
- per-asset update lines like `Updated BTC ...`

That is the sign that Railway is actually running the polling worker instead of
just having the code in the repo.

## Assignment checklist

- monorepo with `apps/web` and `apps/worker`
- Next.js + Tailwind frontend
- Railway worker polling a live external API
- Supabase database with RLS and Realtime
- Supabase Auth magic-link sign-in
- personalization through a per-user watchlist
- assignment architecture write-up in `CLAUDE.md`
