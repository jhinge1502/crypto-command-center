"use client";

import type { Route } from "next";
import Link from "next/link";

import { formatPrice, getChangeBadgeClasses, getChangeClasses } from "../lib/market-guidance";
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

function getTileSize(changePct: number) {
  const strength = Math.min(Math.abs(changePct), 25);

  if (strength >= 15) {
    return "sm:col-span-2 min-h-[12rem]";
  }

  if (strength >= 8) {
    return "sm:col-span-2 min-h-[10.5rem]";
  }

  return "min-h-[9rem]";
}

function formatVolume(value: number | null) {
  if (!value) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(value);
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

  function renderTile(asset: GlobalMover, tone: "gain" | "loss") {
    const isTracked = trackedSet.has(asset.currencyPair);
    const toneClasses =
      tone === "gain"
        ? "border-emerald-300/14 bg-emerald-300/[0.09] hover:border-emerald-200/30 hover:bg-emerald-300/[0.13]"
        : "border-rose-300/14 bg-rose-300/[0.09] hover:border-rose-200/30 hover:bg-rose-300/[0.13]";
    const glowClasses =
      tone === "gain"
        ? "bg-[radial-gradient(circle,_rgba(110,231,183,0.22)_0%,_rgba(110,231,183,0)_72%)]"
        : "bg-[radial-gradient(circle,_rgba(251,113,133,0.22)_0%,_rgba(251,113,133,0)_72%)]";
    const textTone = tone === "gain" ? "text-emerald-100/60" : "text-rose-100/60";

    return (
      <article
        className={`group relative overflow-hidden rounded-[1.6rem] border p-4 transition hover:-translate-y-0.5 ${toneClasses} ${getTileSize(
          asset.priceChangePercentage24h
        )}`}
        key={asset.id}
      >
        <div className={`absolute inset-x-10 top-0 h-24 opacity-0 blur-2xl transition duration-300 group-hover:opacity-100 ${glowClasses}`} />
        <div className="relative flex h-full flex-col">
          <Link className="block" href={asset.detailHref as Route}>
            <div className="flex items-center gap-3">
              {asset.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`${asset.name} logo`}
                  className="h-10 w-10 rounded-full"
                  src={asset.image}
                />
              ) : null}
              <div>
                <p className={`text-xs uppercase tracking-[0.22em] ${textTone}`}>
                  Rank {asset.marketCapRank ?? "n/a"}
                </p>
                <h5 className="mt-1 font-display text-3xl text-white">
                  {asset.symbol}
                </h5>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-300/72">{asset.name}</p>
            <p className="mt-5 text-2xl font-semibold text-white">
              {formatPrice(asset.currentPrice)}
            </p>
            <div
              className={`mt-4 inline-flex rounded-full border px-4 py-2 ${getChangeBadgeClasses(
                asset.priceChangePercentage24h
              )}`}
            >
              <p
                className={`text-lg font-semibold ${getChangeClasses(
                  asset.priceChangePercentage24h
                )}`}
              >
                {asset.priceChangePercentage24h >= 0 ? "+" : ""}
                {asset.priceChangePercentage24h.toFixed(2)}%
              </p>
            </div>
            <p className="mt-3 text-xs text-slate-300/68">
              24h volume {formatVolume(asset.totalVolume)}
            </p>
          </Link>

          <div className="mt-auto pt-4">
            <div className={`flex flex-col items-start gap-3 text-xs uppercase tracking-[0.2em] ${textTone}`}>
              <span>{asset.currencyPair}</span>
              <div className="flex flex-wrap gap-2">
                <Link
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-white/[0.08]"
                  href={asset.detailHref as Route}
                >
                  Open signal deck
                </Link>
                {canManageWatchlist ? (
                  <button
                    className={`rounded-full border px-3 py-2 text-[11px] font-semibold transition ${
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
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-slate-300">
                    Sign in to add
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

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
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300/78">
            This board compares a broad crypto universe by 24-hour movement, so
            your dashboard can show the strongest gainers and losers even when
            they are not in your personal watchlist yet.
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

      <div className="mt-6 grid gap-5 2xl:grid-cols-2">
        <section className="rounded-[1.8rem] border border-emerald-300/12 bg-emerald-300/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/60">
            Highest movers up
          </p>
          <h4 className="mt-2 text-2xl font-semibold text-white">Gainers</h4>
          <div className="mt-4 grid auto-rows-fr gap-3 sm:grid-cols-2">
            {gainers.map((asset) => renderTile(asset, "gain"))}
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-rose-300/12 bg-rose-300/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-rose-200/60">
            Highest movers down
          </p>
          <h4 className="mt-2 text-2xl font-semibold text-white">Losers</h4>
          <div className="mt-4 grid auto-rows-fr gap-3 sm:grid-cols-2">
            {losers.map((asset) => renderTile(asset, "loss"))}
          </div>
        </section>
      </div>
    </section>
  );
}
