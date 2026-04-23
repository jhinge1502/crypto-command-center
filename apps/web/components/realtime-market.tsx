"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "../lib/supabase/browser";
import {
  formatPrice,
  getChangeBadgeClasses,
  getChangeClasses,
  getMarketGuidance,
  getStatusToneClasses
} from "../lib/market-guidance";
import type { GlobalMover, MarketCard } from "../lib/types";
import { MarketHeatmap } from "./market-heatmap";

type Props = {
  initialCards: MarketCard[];
  globalMovers: {
    gainers: GlobalMover[];
    losers: GlobalMover[];
  };
};

function normalizeRows(rows: any[]): MarketCard[] {
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

export function RealtimeMarket({ initialCards, globalMovers }: Props) {
  const [cards, setCards] = useState(initialCards);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("market-snapshots")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "market_snapshots"
        },
        async () => {
          const { data: watchlistData } = await supabase.rpc(
            "latest_market_for_my_watchlist"
          );

          if (watchlistData) {
            setCards(normalizeRows(watchlistData));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const rankedCards = [...cards].sort((left, right) => {
    return getMarketGuidance(right).score - getMarketGuidance(left).score;
  });

  const featuredCard = rankedCards[0];
  const featuredGuidance = featuredCard
    ? getMarketGuidance(featuredCard)
    : null;

  if (cards.length === 0) {
    return (
      <div className="panel-shell rounded-[2rem] border-dashed p-8 text-slate-300/74">
        Add at least one asset to start your live crypto command center.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <MarketHeatmap
          gainers={globalMovers.gainers}
          losers={globalMovers.losers}
        />

        {featuredCard && featuredGuidance ? (
          <section className="panel-shell rounded-[2.25rem] p-6 text-white">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-100/55">
              Spotlight asset
            </p>
            <p className="mt-4 text-sm uppercase tracking-[0.24em] text-cyan-100/45">
              {featuredCard.symbol} - {featuredCard.name}
            </p>
            <h3 className="mt-2 font-display text-4xl leading-tight lg:text-5xl">
              {featuredGuidance.action}
            </h3>
            <p className="mt-3 text-base leading-7 text-slate-300/78">
              {featuredGuidance.summary}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="glass-card rounded-[1.5rem] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Spot price
                </p>
                <p className="mt-2 text-4xl font-semibold">
                  {formatPrice(featuredCard.spotPrice)}
                </p>
              </div>
              <div
                className={`rounded-[1.5rem] border p-4 ${getChangeBadgeClasses(
                  featuredCard.priceChangePct
                )}`}
              >
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Snapshot change
                </p>
                <p
                  className={`mt-2 text-5xl font-semibold ${getChangeClasses(
                    featuredCard.priceChangePct
                  )}`}
                >
                  {featuredCard.priceChangePct >= 0 ? "+" : ""}
                  {featuredCard.priceChangePct.toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-cyan-300/10 bg-cyan-300/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/45">
                Trade note
              </p>
              <p className="mt-2 text-sm font-medium text-white/88">
                Buy {formatPrice(featuredCard.buyPrice)} - Sell {formatPrice(featuredCard.sellPrice)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300/72">
                {featuredGuidance.note}
              </p>
              <p className="mt-3 text-xs text-slate-400">
                Observed {new Date(featuredCard.observedAt).toLocaleString()}
              </p>
            </div>
            <Link
              className="mt-5 inline-flex rounded-full border border-cyan-300/15 bg-cyan-300/[0.08] px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-300/[0.14]"
              href={`/assets/${featuredCard.slug}`}
            >
              Open {featuredCard.symbol} detail page
            </Link>
          </section>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rankedCards.map((card) => {
          const guidance = getMarketGuidance(card);

          return (
            <Link
              className="panel-shell rounded-[2rem] p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/25"
              href={`/assets/${card.slug}`}
              key={card.assetId}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-cyan-100/45">
                    {card.currencyPair}
                  </p>
                  <h3 className="mt-1 font-display text-3xl leading-tight text-white">
                    {card.symbol}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">{card.name}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusToneClasses(
                    guidance.statusTone
                  )}`}
                >
                  {guidance.statusLabel}
                </span>
              </div>

              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    Price
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {formatPrice(card.spotPrice)}
                  </p>
                </div>
                <div
                  className={`rounded-full border px-4 py-2 ${getChangeBadgeClasses(
                    card.priceChangePct
                  )}`}
                >
                  <p
                    className={`text-lg font-semibold ${getChangeClasses(
                      card.priceChangePct
                    )}`}
                  >
                    {card.priceChangePct >= 0 ? "+" : ""}
                    {card.priceChangePct.toFixed(2)}%
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-300/74">
                {guidance.summary}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="glass-card rounded-[1.4rem] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Buy
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    {formatPrice(card.buyPrice)}
                  </p>
                </div>
                <div className="glass-card rounded-[1.4rem] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Sell
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    {formatPrice(card.sellPrice)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-cyan-200/10 bg-cyan-200/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/42">
                  Execution note
                </p>
                <p className="mt-2 text-sm font-medium text-white/88">
                  Spread {card.spreadPct.toFixed(2)}%
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300/72">
                  {guidance.note}
                </p>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                Observed {new Date(card.observedAt).toLocaleString()}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
