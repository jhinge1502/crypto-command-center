# Assignment 4 Architecture

## Project

`Crypto Command Center` is a live, personalized crypto watchlist that helps
users decide which assets deserve attention right now.

The product combines live market data with a lightweight decision layer.
Instead of only showing raw prices, each asset card turns recent movement and
spread into guidance such as `Momentum watch`, `Green tape`, `Cooling off`, or
`Volatility spike`.

The system follows the class architecture:

External API -> Railway worker -> Supabase database -> Supabase Realtime ->
Next.js frontend on Vercel

## Why this source

Coinbase App price endpoints are a strong fit for this assignment because the
official docs describe public price endpoints that do not require authentication
for buy, sell, and spot data:

- [Coinbase Data API Prices](https://docs.cdp.coinbase.com/coinbase-app/track-apis/prices)

This gives the project:

- a live data source with no custom auth complexity
- predictable JSON responses that are easy to normalize in a worker
- enough data to show spot price, buy price, sell price, spread, and recent
  movement

## Product goals

- let users track a personal watchlist of crypto assets
- update the dashboard live without a page refresh
- personalize the experience through auth and saved watchlist items
- translate raw prices into quick action-oriented guidance

## Services

### Frontend (`apps/web`)

- Next.js App Router app deployed to Vercel
- Supabase Auth with email magic link sign-in
- loads the signed-in user's watchlist
- reads the latest market snapshot for each tracked asset
- subscribes to `market_snapshots` through Supabase Realtime
- renders a dark crypto command center with a live constellation board and
  ranked asset cards

### Worker (`apps/worker`)

- Node.js polling service deployed to Railway
- reads tracked assets from Supabase
- calls public Coinbase price endpoints for each asset pair
- writes normalized rows into `market_snapshots`
- updates `last_polled_at` on each asset

### Database (Supabase)

Tables:

- `assets`: the list of supported crypto assets
- `market_snapshots`: time-series market records written by the worker
- `user_watchlist_assets`: per-user watchlist join table

## Data model

### `assets`

Stores the symbols the worker polls:

- `slug`
- `symbol`
- `name`
- `currency_pair`
- `accent`
- `last_polled_at`

### `market_snapshots`

Stores live market records over time:

- `asset_id`
- `observed_at`
- `spot_price`
- `buy_price`
- `sell_price`
- `spread_pct`
- `price_change_pct`
- `price_direction`

The frontend reads the latest snapshot for each watchlist asset, while older
rows remain available for future historical views.

### `user_watchlist_assets`

Stores each signed-in user's personalized watchlist:

- `user_id`
- `asset_id`

This allows each user to see their own custom command center.

## Decision layer

The frontend includes a presentation layer that converts raw market data into
quick guidance. The worker stores normalized source data, and the frontend
derives:

- an action label
- a signal summary
- a status badge
- a ranked "best setup right now" highlight

Examples:

- strong positive change -> `Momentum watch`
- mild positive change -> `Green tape`
- mild negative change -> `Cooling off`
- sharp negative change -> `Volatility spike`

## Data flow

1. A user signs in with Supabase Auth.
2. The frontend loads that user's watchlist from `user_watchlist_assets`.
3. The Railway worker polls public Coinbase price endpoints on an interval.
4. The worker writes fresh rows into `market_snapshots`.
5. Supabase Realtime broadcasts new inserts to subscribed clients.
6. The frontend re-fetches the latest market rows for the signed-in user's
   watchlist.
7. The UI re-renders with updated prices and refreshed guidance.

## Security

- Supabase Auth handles sign-in
- the frontend uses the public anonymous key
- the worker uses the service role key only in server-side environments
- Row Level Security is enabled on user-facing tables
- users can only read and modify their own watchlist rows
- authenticated users can read assets and market snapshots

## Deployment

### Vercel

- deploy the Next.js frontend from `apps/web`
- set `NEXT_PUBLIC_SUPABASE_URL`
- set `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Railway

- deploy the worker from `apps/worker`
- set `SUPABASE_SERVICE_ROLE_KEY`
- set `NEXT_PUBLIC_SUPABASE_URL`
- set `COINBASE_API_BASE_URL`
- set `POLL_INTERVAL_MS`

## Assignment rubric mapping

- multi-service system: Next.js frontend, Railway worker, Supabase database
- live external data source: Coinbase public price endpoints
- realtime updates: Supabase Realtime on `market_snapshots`
- auth: Supabase Auth magic link flow
- personalization: watchlist per user
- deployment: Vercel for web, Railway for worker
- shareable app: classmates can sign up and get their own watchlists
