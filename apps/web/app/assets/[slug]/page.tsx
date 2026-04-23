import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  fetchOrderBook,
  fetchProductDetails,
  fetchRecentTrades
} from "../../../lib/coinbase-market";
import { formatPrice, getChangeClasses } from "../../../lib/market-guidance";
import { createClient } from "../../../lib/supabase/server";

function formatUnits(value: number) {
  if (value >= 1000) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2
    }).format(value);
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(value);
}

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AssetDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: asset } = await supabase
    .from("assets")
    .select("id, slug, symbol, name, currency_pair, accent, last_polled_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!asset) {
    notFound();
  }

  const { data: snapshot } = await supabase
    .from("market_snapshots")
    .select(
      "observed_at, spot_price, buy_price, sell_price, spread_pct, price_change_pct, price_direction"
    )
    .eq("asset_id", asset.id)
    .order("observed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [product, orderBook, recentTrades] = await Promise.all([
    fetchProductDetails(asset.currency_pair),
    fetchOrderBook(asset.currency_pair),
    fetchRecentTrades(asset.currency_pair)
  ]);

  const snapshotChange = Number(snapshot?.price_change_pct ?? 0);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 text-white">
      <section className="rounded-[2.5rem] border border-cyan-300/10 bg-[rgba(6,16,27,0.84)] p-8 shadow-[0_32px_90px_rgba(1,6,15,0.6)] backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              className="text-sm uppercase tracking-[0.26em] text-cyan-100/55 transition hover:text-cyan-100"
              href="/"
            >
              Back to dashboard
            </Link>
            <p className="mt-4 text-sm uppercase tracking-[0.32em] text-cyan-100/45">
              {asset.currency_pair}
            </p>
            <h1 className="mt-2 font-display text-5xl leading-tight">
              {asset.symbol} market detail
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300/78">
              Order-book depth, best bid and ask, spread, recent trades, and
              the latest worker snapshot for {asset.name}.
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-cyan-300/12 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Snapshot change
            </p>
            <p className={`mt-2 text-4xl font-semibold ${getChangeClasses(snapshotChange)}`}>
              {snapshotChange >= 0 ? "+" : ""}
              {snapshotChange.toFixed(2)}%
            </p>
            <p className="mt-2 text-sm text-slate-300/72">
              Latest worker snapshot at{" "}
              {snapshot?.observed_at
                ? new Date(snapshot.observed_at).toLocaleString()
                : "not available"}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-cyan-300/10 bg-[rgba(5,15,26,0.88)] p-6 shadow-[0_24px_60px_rgba(1,8,16,0.42)]">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-100/55">
            Order book
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Best bid
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">
                {formatPrice(orderBook.bestBid)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Best ask
              </p>
              <p className="mt-2 text-2xl font-semibold text-rose-300">
                {formatPrice(orderBook.bestAsk)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Spread
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {formatPrice(orderBook.spreadAbsolute)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {orderBook.spreadPct.toFixed(4)}%
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Book time
              </p>
              <p className="mt-2 text-sm font-semibold">
                {new Date(orderBook.observedAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.6rem] border border-emerald-300/12 bg-emerald-300/[0.05] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/60">
                    BID depth
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {formatUnits(orderBook.topBidVolume)} {product.baseCurrency}
                  </h2>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {orderBook.bids.slice(0, 6).map((level) => (
                  <div
                    className="flex items-center justify-between rounded-full bg-white/[0.04] px-4 py-2 text-sm"
                    key={`bid-${level.price}`}
                  >
                    <span className="font-medium text-emerald-300">
                      {formatPrice(level.price)}
                    </span>
                    <span className="text-slate-300">
                      {formatUnits(level.size)} · {level.orderCount} orders
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-rose-300/12 bg-rose-300/[0.05] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-rose-100/60">
                    ASK depth
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {formatUnits(orderBook.topAskVolume)} {product.baseCurrency}
                  </h2>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {orderBook.asks.slice(0, 6).map((level) => (
                  <div
                    className="flex items-center justify-between rounded-full bg-white/[0.04] px-4 py-2 text-sm"
                    key={`ask-${level.price}`}
                  >
                    <span className="font-medium text-rose-300">
                      {formatPrice(level.price)}
                    </span>
                    <span className="text-slate-300">
                      {formatUnits(level.size)} · {level.orderCount} orders
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <section className="rounded-[2rem] border border-cyan-300/10 bg-[rgba(5,15,26,0.88)] p-6 shadow-[0_24px_60px_rgba(1,8,16,0.42)]">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-100/55">
              Product stats
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-white/8 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Market status
                </p>
                <p className="mt-2 text-lg font-semibold capitalize">
                  {product.status}
                </p>
                {product.statusMessage ? (
                  <p className="mt-1 text-sm text-slate-400">
                    {product.statusMessage}
                  </p>
                ) : null}
              </div>
              <div className="rounded-[1.4rem] border border-white/8 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Display name
                </p>
                <p className="mt-2 text-lg font-semibold">{product.displayName}</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/8 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Base increment
                </p>
                <p className="mt-2 text-lg font-semibold">{product.baseIncrement}</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/8 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Quote increment
                </p>
                <p className="mt-2 text-lg font-semibold">{product.quoteIncrement}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-slate-200">
                Post only: {product.postOnly ? "yes" : "no"}
              </span>
              <span className="rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-slate-200">
                Limit only: {product.limitOnly ? "yes" : "no"}
              </span>
              <span className="rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-slate-200">
                Cancel only: {product.cancelOnly ? "yes" : "no"}
              </span>
              <span className="rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-slate-200">
                Auction mode: {product.auctionMode ? "yes" : "no"}
              </span>
            </div>
          </section>

          <section className="rounded-[2rem] border border-cyan-300/10 bg-[rgba(5,15,26,0.88)] p-6 shadow-[0_24px_60px_rgba(1,8,16,0.42)]">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-100/55">
              Recent trades
            </p>
            <div className="mt-5 space-y-3">
              {recentTrades.map((trade) => (
                <div
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.3rem] border border-white/8 bg-white/[0.04] px-4 py-3"
                  key={trade.tradeId}
                >
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                      trade.side === "buy"
                        ? "bg-emerald-300/10 text-emerald-200"
                        : "bg-rose-300/10 text-rose-200"
                    }`}
                  >
                    {trade.side}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {formatPrice(trade.price)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatUnits(trade.size)} {product.baseCurrency}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {new Date(trade.time).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
