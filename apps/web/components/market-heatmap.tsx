"use client";

import type { Route } from "next";
import Link from "next/link";

import {
  formatPrice,
  getChangeBadgeClasses,
  getChangeClasses
} from "../lib/market-guidance";
import type { GlobalMover } from "../lib/types";

type Props = {
  gainers: GlobalMover[];
  losers: GlobalMover[];
  canManageWatchlist?: boolean;
  trackedCurrencyPairs?: string[];
  onAddAsset?: (asset: {
    symbol: string;
    name: string;
    currencyPair: string;
  }) => Promise<void>;
};

function formatVolume(value: number | null) {
  if (!value) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(value);
}

function HeatmapTile({
  asset,
  canManageWatchlist,
  isTracked,
  onAddAsset,
  tone
}: {
  asset: GlobalMover;
  canManageWatchlist: boolean;
  isTracked: boolean;
  onAddAsset?: (asset: {
    symbol: string;
    name: string;
    currencyPair: string;
  }) => Promise<void>;
  tone: "gain" | "loss";
}) {
  const surfaceClasses =
    tone === "gain"
      ? "border-emerald-300/14 bg-emerald-300/[0.08] hover:border-emerald-200/28 hover:bg-emerald-300/[0.12]"
      : "border-rose-300/14 bg-rose-300/[0.08] hover:border-rose-200/28 hover:bg-rose-300/[0.12]";
  const toneText = tone === "gain" ? "text-emerald-100/62" : "text-rose-100/62";

  return (
    <article
      className={`group rounded-[1.35rem] border p-3.5 transition hover:-translate-y-0.5 ${surfaceClasses}`}
    >
      <Link className="block" href={asset.detailHref as Route}>
        <div className="flex items-center gap-2">
          {asset.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`${asset.name} logo`}
              className="h-8 w-8 rounded-full"
              src={asset.image}
            />
          ) : null}
          <div className="min-w-0">
            <p className={`text-[10px] uppercase tracking-[0.18em] ${toneText}`}>
              Rank {asset.marketCapRank ?? "n/a"}
            </p>
            <h5 className="truncate font-display text-[2rem] leading-none text-white">
              {asset.symbol}
            </h5>
          </div>
        </div>

        <p className="mt-2 line-clamp-2 min-h-[2rem] text-xs text-slate-300/74">
          {asset.name}
        </p>
        <p className="mt-3 text-[1.55rem] font-semibold text-white">
          {formatPrice(asset.currentPrice)}
        </p>
        <div
          className={`mt-3 inline-flex rounded-full border px-3 py-1.5 ${getChangeBadgeClasses(
            asset.priceChangePercentage24h
          )}`}
        >
          <p
            className={`text-sm font-semibold ${getChangeClasses(
              asset.priceChangePercentage24h
            )}`}
          >
            {asset.priceChangePercentage24h >= 0 ? "+" : ""}
            {asset.priceChangePercentage24h.toFixed(2)}%
          </p>
        </div>
        <p className="mt-2 text-[11px] text-slate-300/66">
          24h volume {formatVolume(asset.totalVolume)}
        </p>
        <p className={`mt-3 text-[10px] uppercase tracking-[0.18em] ${toneText}`}>
          {asset.currencyPair}
        </p>
      </Link>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/[0.08]"
          href={asset.detailHref as Route}
        >
          Open
        </Link>
        {canManageWatchlist ? (
          <button
            className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
              isTracked
                ? "border-cyan-300/14 bg-cyan-300/10 text-cyan-50"
                : "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-50 hover:bg-cyan-300/[0.14]"
            }`}
            disabled={isTracked}
            onClick={() => onAddAsset?.(asset)}
            type="button"
          >
            {isTracked ? "In watchlist" : "Add to watchlist"}
          </button>
        ) : (
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            Sign in to add
          </span>
        )}
      </div>
    </article>
  );
}

export function MarketHeatmap({
  gainers,
  losers,
  canManageWatchlist = false,
  trackedCurrencyPairs = [],
  onAddAsset
}: Props) {
  const totalTracked = gainers.length + losers.length;
  const trackedSet = new Set(trackedCurrencyPairs);

  return (
    <section className="panel-shell rounded-[2.25rem] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-100/55">
            Global movers
          </p>
          <h3 className="mt-2 font-display text-4xl text-white">
            24h market heatmap
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300/78">
            Scan the strongest movers across the market first, then log in if
            you want to turn those names into a personal tracked watchlist.
          </p>
        </div>
        <div className="rounded-full border border-cyan-300/15 bg-white/5 px-4 py-2 text-right">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
            Movers shown
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {totalTracked}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[1.4rem] border border-cyan-300/12 bg-cyan-300/[0.06] px-4 py-3">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/55">
          Custom list available
        </p>
        <p className="mt-1 text-sm text-slate-200/88">
          Want your own shortlist? Log in and use the add buttons below to turn
          any mover into a live tracked watchlist card.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <section className="rounded-[1.7rem] border border-emerald-300/12 bg-emerald-300/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/60">
                Highest movers up
              </p>
              <h4 className="mt-1 text-2xl font-semibold text-white">Top gainers</h4>
            </div>
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/55">
              6 names
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {gainers.map((asset) => (
              <HeatmapTile
                asset={asset}
                canManageWatchlist={canManageWatchlist}
                isTracked={trackedSet.has(asset.currencyPair)}
                key={asset.id}
                onAddAsset={onAddAsset}
                tone="gain"
              />
            ))}
          </div>
        </section>

        <section className="rounded-[1.7rem] border border-rose-300/12 bg-rose-300/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-rose-200/60">
                Highest movers down
              </p>
              <h4 className="mt-1 text-2xl font-semibold text-white">Top losers</h4>
            </div>
            <p className="text-xs uppercase tracking-[0.24em] text-rose-100/55">
              6 names
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {losers.map((asset) => (
              <HeatmapTile
                asset={asset}
                canManageWatchlist={canManageWatchlist}
                isTracked={trackedSet.has(asset.currencyPair)}
                key={asset.id}
                onAddAsset={onAddAsset}
                tone="loss"
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
