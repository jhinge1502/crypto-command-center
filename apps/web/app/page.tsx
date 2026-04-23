import { AuthPanel } from "../components/auth-panel";
import { RealtimeMarket } from "../components/realtime-market";
import { WatchlistManager } from "../components/watchlist-manager";
import { fetchGlobalMovers } from "../lib/coingecko";
import { createClient } from "../lib/supabase/server";
import type { AssetOption, MarketCard } from "../lib/types";

function normalizeAssets(rows: any[] | null): AssetOption[] {
  if (!rows) {
    return [];
  }

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    symbol: row.symbol,
    name: row.name,
    currencyPair: row.currency_pair,
    accent: row.accent
  }));
}

function normalizeRows(rows: any[] | null): MarketCard[] {
  if (!rows) {
    return [];
  }

  return rows.map((row) => ({
    assetId: row.asset_id,
    slug: row.slug,
    symbol: row.symbol,
    name: row.asset_name,
    currencyPair: row.currency_pair,
    accent: row.accent,
    observedAt: row.observed_at,
    spotPrice: Number(row.spot_price),
    buyPrice: Number(row.buy_price),
    sellPrice: Number(row.sell_price),
    spreadPct: Number(row.spread_pct),
    priceChangePct: Number(row.price_change_pct ?? 0),
    priceDirection: row.price_direction
  }));
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: assets } = await supabase
    .from("assets")
    .select("id, slug, symbol, name, currency_pair, accent")
    .order("symbol");

  const { data: watchlistRows } = user
    ? await supabase
        .from("user_watchlist_assets")
        .select("asset_id")
        .eq("user_id", user.id)
    : { data: [] as { asset_id: string }[] };

  const { data } = user
    ? await supabase.rpc("latest_market_for_my_watchlist")
    : { data: [] };

  const globalMovers = await fetchGlobalMovers();

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
      <section className="panel-shell relative overflow-hidden rounded-[2.9rem] p-8 lg:p-10">
        <div className="absolute -left-12 top-8 h-48 w-48 rounded-full bg-cyan-300/16 blur-3xl" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-100/48">
          Assignment 4 live system
        </p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex items-center rounded-full border border-cyan-300/14 bg-cyan-300/[0.08] px-4 py-2 text-xs uppercase tracking-[0.28em] text-cyan-50">
              Dark market console - realtime watchlist - 24h movers
            </div>
            <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[0.94] text-white lg:text-7xl">
              Trade the board with a sharper, live crypto command center.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300/82 lg:text-lg">
              Track a custom watchlist, compare it against the biggest 24-hour
              movers in crypto, and open each market into a richer signal deck
              with order book, spread, and trade flow context.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="glass-card rounded-[1.85rem] p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/45">
                  Worker
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Coinbase polling
                </p>
                <p className="mt-1 text-sm text-slate-300/72">
                  A Railway worker polls live public crypto pricing endpoints
                  and writes snapshots into Supabase.
                </p>
              </div>
              <div className="glass-card rounded-[1.85rem] p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/45">
                  Realtime
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Watchlist pulse
                </p>
                <p className="mt-1 text-sm text-slate-300/72">
                  New market rows push into the dashboard without a manual
                  refresh.
                </p>
              </div>
              <div className="glass-card rounded-[1.85rem] p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/45">
                  Market view
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Global movers
                </p>
                <p className="mt-1 text-sm text-slate-300/72">
                  A separate 24-hour heatmap surfaces names that are moving
                  hardest even before you decide to track them.
                </p>
              </div>
            </div>
          </div>
          <AuthPanel userEmail={user?.email} />
        </div>
      </section>

      <section className="mt-8">
        {user ? (
          <div className="mb-6">
            <WatchlistManager
              assets={normalizeAssets(assets)}
              selectedAssetIds={(watchlistRows ?? []).map((row) => row.asset_id)}
              userId={user.id}
            />
          </div>
        ) : null}
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-100/48">
              Realtime feed
            </p>
            <h2 className="mt-1 font-display text-4xl text-white">
              Your market board
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/72">
              A dark watchlist console with live prices, buy and sell quotes,
              spread monitoring, and quick signal framing.
            </p>
          </div>
        </div>
        {user ? (
          <RealtimeMarket
            initialCards={normalizeRows(data)}
            globalMovers={globalMovers}
          />
        ) : (
          <div className="panel-shell rounded-[2rem] border-dashed p-8 text-slate-300/74">
            Sign in to unlock watchlist actions, add assets, and stream your
            live crypto command center.
          </div>
        )}
      </section>
    </main>
  );
}
