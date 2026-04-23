import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { fetchGlobalMoverDetail } from "../../../lib/coingecko";
import {
  fetchOrderBook,
  fetchProductDetails,
  fetchRecentTrades
} from "../../../lib/coinbase-market";
import {
  formatPrice,
  getChangeBadgeClasses,
  getChangeClasses
} from "../../../lib/market-guidance";
import { createClient } from "../../../lib/supabase/server";

function formatCompactNumber(value: number | null) {
  if (!value) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(value);
}

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
    coinId: string;
  }>;
};

export default async function MarketDetailPage({ params }: PageProps) {
  const { coinId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  let mover;

  try {
    mover = await fetchGlobalMoverDetail(coinId);
  } catch {
    notFound();
  }

  const { data: trackedAsset } = await supabase
    .from("assets")
    .select("id, slug, symbol, name, currency_pair")
    .eq("currency_pair", mover.currencyPair)
    .maybeSingle();

  const { data: snapshot } = trackedAsset
    ? await supabase
        .from("market_snapshots")
        .select(
          "observed_at, spot_price, buy_price, sell_price, spread_pct, price_change_pct, price_direction"
        )
        .eq("asset_id", trackedAsset.id)
        .order("observed_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const [productResult, orderBookResult, recentTradesResult] =
    await Promise.allSettled([
      fetchProductDetails(mover.currencyPair),
      fetchOrderBook(mover.currencyPair),
      fetchRecentTrades(mover.currencyPair)
    ]);

  const product =
    productResult.status === "fulfilled" ? productResult.value : null;
  const orderBook =
    orderBookResult.status === "fulfilled" ? orderBookResult.value : null;
  const recentTrades =
    recentTradesResult.status === "fulfilled" ? recentTradesResult.value : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 text-white">
      <section className="panel-shell relative overflow-hidden rounded-[2.8rem] px-8 py-8 lg:px-10">
        <div className="absolute inset-y-0 right-0 w-72 rounded-full bg-[radial-gradient(circle,_rgba(248,113,113,0.16)_0%,_rgba(248,113,113,0)_72%)] blur-3xl" />
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-cyan-200/45 to-transparent" />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <Link
              className="text-sm uppercase tracking-[0.26em] text-cyan-100/55 transition hover:text-cyan-100"
              href="/"
            >
              Back to dashboard
            </Link>
            <p className="mt-4 text-sm uppercase tracking-[0.32em] text-cyan-100/45">
              Global mover detail
            </p>
            <div className="mt-3 flex items-center gap-4">
              {mover.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`${mover.name} logo`}
                  className="h-14 w-14 rounded-full border border-white/10 bg-white/5 p-1"
                  src={mover.image}
                />
              ) : null}
              <div>
                <h1 className="font-display text-5xl leading-tight lg:text-6xl">
                  {mover.symbol} signal deck
                </h1>
                <p className="mt-2 max-w-2xl text-base leading-7 text-slate-300/78">
                  24-hour mover stats, market structure, and Coinbase order book
                  detail for {mover.name}.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              24h change
            </p>
            <div
              className={`mt-3 inline-flex rounded-full border px-4 py-2 ${getChangeBadgeClasses(
                mover.priceChangePercentage24h
              )}`}
            >
              <p
                className={`text-3xl font-semibold ${getChangeClasses(
                  mover.priceChangePercentage24h
                )}`}
              >
                {mover.priceChangePercentage24h >= 0 ? "+" : ""}
                {mover.priceChangePercentage24h.toFixed(2)}%
              </p>
            </div>
            <p className="mt-3 text-sm text-slate-300/72">
              Price now {formatPrice(mover.currentPrice)}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Pair {mover.currencyPair}
            </p>
          </div>
        </div>

        <div className="relative mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="glass-card rounded-[1.7rem] p-5">
            <p className="eyebrow">Spot price</p>
            <p className="mt-3 text-4xl font-semibold text-white">
              {formatPrice(mover.currentPrice)}
            </p>
          </div>
          <div className="glass-card rounded-[1.7rem] p-5">
            <p className="eyebrow">24h high</p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {mover.high24h ? formatPrice(mover.high24h) : "n/a"}
            </p>
          </div>
          <div className="glass-card rounded-[1.7rem] p-5">
            <p className="eyebrow">24h low</p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {mover.low24h ? formatPrice(mover.low24h) : "n/a"}
            </p>
          </div>
          <div className="glass-card rounded-[1.7rem] p-5">
            <p className="eyebrow">24h volume</p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {formatCompactNumber(mover.totalVolume)}
            </p>
          </div>
          <div className="glass-card rounded-[1.7rem] p-5">
            <p className="eyebrow">Market cap rank</p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {mover.marketCapRank ?? "n/a"}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="space-y-5">
          <section className="panel-shell rounded-[2.2rem] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Order flow</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">
                  Best bid, best ask, and book depth
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/72">
                  This view mirrors the tracked-asset detail experience whenever
                  Coinbase exposes an active USD market for the mover.
                </p>
              </div>
              {trackedAsset ? (
                <Link
                  className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/14"
                  href={`/assets/${trackedAsset.slug}`}
                >
                  Open tracked asset page
                </Link>
              ) : null}
            </div>

            {product && orderBook ? (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="glass-card rounded-[1.5rem] p-4">
                    <p className="eyebrow">Best bid</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-300">
                      {formatPrice(orderBook.bestBid)}
                    </p>
                  </div>
                  <div className="glass-card rounded-[1.5rem] p-4">
                    <p className="eyebrow">Best ask</p>
                    <p className="mt-2 text-2xl font-semibold text-rose-300">
                      {formatPrice(orderBook.bestAsk)}
                    </p>
                  </div>
                  <div className="glass-card rounded-[1.5rem] p-4">
                    <p className="eyebrow">Spread</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {formatPrice(orderBook.spreadAbsolute)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {orderBook.spreadPct.toFixed(4)}%
                    </p>
                  </div>
                  <div className="glass-card rounded-[1.5rem] p-4">
                    <p className="eyebrow">Book time</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {new Date(orderBook.observedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.7rem] border border-emerald-300/12 bg-emerald-300/[0.06] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/60">
                      Bid depth
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">
                      {formatUnits(orderBook.topBidVolume)} {product.baseCurrency}
                    </h3>
                    <div className="mt-4 space-y-2">
                      {orderBook.bids.slice(0, 6).map((level) => (
                        <div
                          className="flex items-center justify-between rounded-full bg-white/[0.05] px-4 py-2 text-sm"
                          key={`bid-${level.price}`}
                        >
                          <span className="font-medium text-emerald-300">
                            {formatPrice(level.price)}
                          </span>
                          <span className="text-slate-300">
                            {formatUnits(level.size)} - {level.orderCount} orders
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.7rem] border border-rose-300/12 bg-rose-300/[0.06] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-rose-100/60">
                      Ask depth
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">
                      {formatUnits(orderBook.topAskVolume)} {product.baseCurrency}
                    </h3>
                    <div className="mt-4 space-y-2">
                      {orderBook.asks.slice(0, 6).map((level) => (
                        <div
                          className="flex items-center justify-between rounded-full bg-white/[0.05] px-4 py-2 text-sm"
                          key={`ask-${level.price}`}
                        >
                          <span className="font-medium text-rose-300">
                            {formatPrice(level.price)}
                          </span>
                          <span className="text-slate-300">
                            {formatUnits(level.size)} - {level.orderCount} orders
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-[1.8rem] border border-dashed border-cyan-200/14 bg-white/[0.03] p-6">
                <p className="eyebrow">Market access note</p>
                <p className="mt-3 text-lg font-semibold text-white">
                  Coinbase order-book data is not available for {mover.currencyPair}.
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/72">
                  You can still use the global 24-hour mover data here, but the
                  bid and ask ladder only appears when Coinbase exposes this USD
                  market.
                </p>
              </div>
            )}
          </section>

          <section className="panel-shell rounded-[2.2rem] p-6">
            <p className="eyebrow">Recent trades</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              Tape read
            </h2>
            {recentTrades.length ? (
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
                      {product ? (
                        <p className="text-xs text-slate-400">
                          {formatUnits(trade.size)} {product.baseCurrency}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(trade.time).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-300/72">
                Recent Coinbase trades are not available for this mover right now.
              </p>
            )}
          </section>
        </section>

        <section className="space-y-5">
          <section className="panel-shell rounded-[2.2rem] p-6">
            <p className="eyebrow">Market snapshot</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="glass-card rounded-[1.5rem] p-4">
                <p className="eyebrow">Market cap</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatCompactNumber(mover.marketCap)}
                </p>
              </div>
              <div className="glass-card rounded-[1.5rem] p-4">
                <p className="eyebrow">FDV</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatCompactNumber(mover.fullyDilutedValuation)}
                </p>
              </div>
              <div className="glass-card rounded-[1.5rem] p-4">
                <p className="eyebrow">Circulating supply</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatCompactNumber(mover.circulatingSupply)}
                </p>
              </div>
              <div className="glass-card rounded-[1.5rem] p-4">
                <p className="eyebrow">Coin ID</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {mover.id}
                </p>
              </div>
            </div>
          </section>

          <section className="panel-shell rounded-[2.2rem] p-6">
            <p className="eyebrow">Tracked snapshot</p>
            {snapshot ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="glass-card rounded-[1.5rem] p-4">
                    <p className="eyebrow">Worker change</p>
                    <p
                      className={`mt-2 text-3xl font-semibold ${getChangeClasses(
                        Number(snapshot.price_change_pct ?? 0)
                      )}`}
                    >
                      {Number(snapshot.price_change_pct ?? 0) >= 0 ? "+" : ""}
                      {Number(snapshot.price_change_pct ?? 0).toFixed(2)}%
                    </p>
                  </div>
                  <div className="glass-card rounded-[1.5rem] p-4">
                    <p className="eyebrow">Spread</p>
                    <p className="mt-2 text-3xl font-semibold text-white">
                      {Number(snapshot.spread_pct ?? 0).toFixed(2)}%
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-300/72">
                  Snapshot observed{" "}
                  {snapshot.observed_at
                    ? new Date(snapshot.observed_at).toLocaleString()
                    : "not available"}
                </p>
                {trackedAsset ? (
                  <Link
                    className="mt-5 inline-flex rounded-full border border-cyan-300/18 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                    href={`/assets/${trackedAsset.slug}`}
                  >
                    Open full tracked asset page
                  </Link>
                ) : null}
              </>
            ) : (
              <div className="mt-4 rounded-[1.7rem] border border-dashed border-amber-300/16 bg-amber-300/[0.06] p-5">
                <p className="text-sm font-medium text-white">
                  This mover is not in the tracked watchlist dataset yet.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300/72">
                  Add {mover.symbol} to your watchlist if you want Railway worker
                  snapshots and Supabase realtime updates for this market too.
                </p>
              </div>
            )}
          </section>

          {product ? (
            <section className="panel-shell rounded-[2.2rem] p-6">
              <p className="eyebrow">Exchange flags</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="glass-card rounded-[1.5rem] p-4">
                  <p className="eyebrow">Display name</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {product.displayName}
                  </p>
                </div>
                <div className="glass-card rounded-[1.5rem] p-4">
                  <p className="eyebrow">Market status</p>
                  <p className="mt-2 text-lg font-semibold capitalize text-white">
                    {product.status}
                  </p>
                </div>
                <div className="glass-card rounded-[1.5rem] p-4">
                  <p className="eyebrow">Base increment</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {product.baseIncrement}
                  </p>
                </div>
                <div className="glass-card rounded-[1.5rem] p-4">
                  <p className="eyebrow">Quote increment</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {product.quoteIncrement}
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </section>
      </section>
    </main>
  );
}
