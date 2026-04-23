create extension if not exists "pgcrypto";

drop function if exists public.latest_weather_for_my_favorites();

drop table if exists public.user_favorite_locations cascade;
drop table if exists public.weather_snapshots cascade;
drop table if exists public.locations cascade;

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  symbol text not null unique,
  name text not null,
  currency_pair text not null unique,
  accent text not null default '#22d3ee',
  last_polled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  observed_at timestamptz not null,
  spot_price numeric(18, 8) not null,
  buy_price numeric(18, 8) not null,
  sell_price numeric(18, 8) not null,
  spread_pct numeric(10, 4) not null,
  price_change_pct numeric(10, 4),
  price_direction text not null default 'flat' check (price_direction in ('up', 'down', 'flat')),
  created_at timestamptz not null default now(),
  unique (asset_id, observed_at)
);

create table if not exists public.user_watchlist_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, asset_id)
);

create or replace function public.latest_market_for_my_watchlist()
returns table (
  asset_id uuid,
  slug text,
  symbol text,
  asset_name text,
  currency_pair text,
  accent text,
  observed_at timestamptz,
  spot_price numeric,
  buy_price numeric,
  sell_price numeric,
  spread_pct numeric,
  price_change_pct numeric,
  price_direction text
)
language sql
security definer
set search_path = public
as $$
  select distinct on (a.id)
    a.id as asset_id,
    a.slug,
    a.symbol,
    a.name as asset_name,
    a.currency_pair,
    a.accent,
    ms.observed_at,
    ms.spot_price,
    ms.buy_price,
    ms.sell_price,
    ms.spread_pct,
    ms.price_change_pct,
    ms.price_direction
  from public.user_watchlist_assets uwa
  join public.assets a on a.id = uwa.asset_id
  join public.market_snapshots ms on ms.asset_id = a.id
  where uwa.user_id = auth.uid()
  order by a.id, ms.observed_at desc
$$;

create or replace function public.latest_market_for_all_assets()
returns table (
  asset_id uuid,
  slug text,
  symbol text,
  asset_name text,
  currency_pair text,
  accent text,
  observed_at timestamptz,
  spot_price numeric,
  buy_price numeric,
  sell_price numeric,
  spread_pct numeric,
  price_change_pct numeric,
  price_direction text
)
language sql
security definer
set search_path = public
as $$
  select distinct on (a.id)
    a.id as asset_id,
    a.slug,
    a.symbol,
    a.name as asset_name,
    a.currency_pair,
    a.accent,
    ms.observed_at,
    ms.spot_price,
    ms.buy_price,
    ms.sell_price,
    ms.spread_pct,
    ms.price_change_pct,
    ms.price_direction
  from public.assets a
  join public.market_snapshots ms on ms.asset_id = a.id
  order by a.id, ms.observed_at desc
$$;

alter table public.assets enable row level security;
alter table public.market_snapshots enable row level security;
alter table public.user_watchlist_assets enable row level security;

drop policy if exists "authenticated users can read assets" on public.assets;
create policy "authenticated users can read assets"
on public.assets for select
to authenticated
using (true);

drop policy if exists "authenticated users can read market snapshots" on public.market_snapshots;
create policy "authenticated users can read market snapshots"
on public.market_snapshots for select
to authenticated
using (true);

drop policy if exists "users can read their own watchlist" on public.user_watchlist_assets;
create policy "users can read their own watchlist"
on public.user_watchlist_assets for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert their own watchlist" on public.user_watchlist_assets;
create policy "users can insert their own watchlist"
on public.user_watchlist_assets for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can delete their own watchlist" on public.user_watchlist_assets;
create policy "users can delete their own watchlist"
on public.user_watchlist_assets for delete
to authenticated
using (auth.uid() = user_id);

grant execute on function public.latest_market_for_my_watchlist() to authenticated;
grant execute on function public.latest_market_for_all_assets() to authenticated;

insert into public.assets (slug, symbol, name, currency_pair, accent)
values
  ('bitcoin', 'BTC', 'Bitcoin', 'BTC-USD', '#f7931a'),
  ('ethereum', 'ETH', 'Ethereum', 'ETH-USD', '#627eea'),
  ('solana', 'SOL', 'Solana', 'SOL-USD', '#14f195'),
  ('ripple', 'XRP', 'XRP', 'XRP-USD', '#23292f'),
  ('cardano', 'ADA', 'Cardano', 'ADA-USD', '#2a6df4'),
  ('dogecoin', 'DOGE', 'Dogecoin', 'DOGE-USD', '#c2a633'),
  ('chainlink', 'LINK', 'Chainlink', 'LINK-USD', '#2a5ada'),
  ('avalanche', 'AVAX', 'Avalanche', 'AVAX-USD', '#e84142')
on conflict (slug) do update
set
  symbol = excluded.symbol,
  name = excluded.name,
  currency_pair = excluded.currency_pair,
  accent = excluded.accent;

alter publication supabase_realtime add table public.market_snapshots;
