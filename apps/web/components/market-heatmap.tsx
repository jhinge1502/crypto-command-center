"use client";

import type { Route } from "next";
import Link from "next/link";

import { formatPrice, getChangeBadgeClasses, getChangeClasses } from "../lib/market-guidance";
import type { GlobalMover } from "../lib/types";

type Props = {
  gainers: GlobalMover[];
  losers: GlobalMover[];
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

export function MarketHeatmap({ gainers, losers }: Props) {
  const totalTracked = gainers.length + losers.length;

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
            {gainers.map((asset) => (
              <Link
                className={`group relative overflow-hidden rounded-[1.6rem] border border-emerald-300/14 bg-emerald-300/[0.09] p-4 transition hover:-translate-y-0.5 hover:border-emerald-200/30 hover:bg-emerald-300/[0.13] ${getTileSize(
                  asset.priceChangePercentage24h
                )}`}
                href={asset.detailHref as Route}
                key={asset.id}
              >
                <div className="absolute inset-x-10 top-0 h-24 bg-[radial-gradient(circle,_rgba(110,231,183,0.22)_0%,_rgba(110,231,183,0)_72%)] opacity-0 blur-2xl transition duration-300 group-hover:opacity-100" />
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
                    <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/65">
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
                    +{asset.priceChangePercentage24h.toFixed(2)}%
                  </p>
                </div>
                <p className="mt-3 text-xs text-slate-300/68">
                  24h volume {formatVolume(asset.totalVolume)}
                </p>
                <div className="mt-4 flex flex-col items-start gap-2 text-xs uppercase tracking-[0.2em] text-emerald-100/60 sm:flex-row sm:items-center sm:justify-between">
                  <span>{asset.currencyPair}</span>
                  <span className="transition group-hover:text-white">Open signal deck</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-rose-300/12 bg-rose-300/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-rose-200/60">
            Highest movers down
          </p>
          <h4 className="mt-2 text-2xl font-semibold text-white">Losers</h4>
          <div className="mt-4 grid auto-rows-fr gap-3 sm:grid-cols-2">
            {losers.map((asset) => (
              <Link
                className={`group relative overflow-hidden rounded-[1.6rem] border border-rose-300/14 bg-rose-300/[0.09] p-4 transition hover:-translate-y-0.5 hover:border-rose-200/30 hover:bg-rose-300/[0.13] ${getTileSize(
                  asset.priceChangePercentage24h
                )}`}
                href={asset.detailHref as Route}
                key={asset.id}
              >
                <div className="absolute inset-x-10 top-0 h-24 bg-[radial-gradient(circle,_rgba(251,113,133,0.22)_0%,_rgba(251,113,133,0)_72%)] opacity-0 blur-2xl transition duration-300 group-hover:opacity-100" />
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
                    <p className="text-xs uppercase tracking-[0.22em] text-rose-100/65">
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
                    {asset.priceChangePercentage24h.toFixed(2)}%
                  </p>
                </div>
                <p className="mt-3 text-xs text-slate-300/68">
                  24h volume {formatVolume(asset.totalVolume)}
                </p>
                <div className="mt-4 flex flex-col items-start gap-2 text-xs uppercase tracking-[0.2em] text-rose-100/60 sm:flex-row sm:items-center sm:justify-between">
                  <span>{asset.currencyPair}</span>
                  <span className="transition group-hover:text-white">Open signal deck</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
