"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "../lib/supabase/browser";
import {
  formatPrice,
  getChangeBadgeClasses,
  getChangeClasses,
  getMarketGuidance,
  getStatusToneClasses
} from "../lib/market-guidance";
import type { AssetOption, GlobalMover, MarketCard } from "../lib/types";
import { MarketHeatmap } from "./market-heatmap";

type Props = {
  initialCards: MarketCard[];
  globalMovers: {
    gainers: GlobalMover[];
    losers: GlobalMover[];
  };
  isSignedIn: boolean;
  initialTrackedAssets: AssetOption[];
  onWatchlistAssetAdded?: (payload: {
    asset: AssetOption;
    card: MarketCard | null;
  }) => void;
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

export function RealtimeMarket({
  initialCards,
  globalMovers,
  isSignedIn,
  initialTrackedAssets,
  onWatchlistAssetAdded
}: Props) {
  const [cards, setCards] = useState(initialCards);
  const [heatmapStatus, setHeatmapStatus] = useState<string | null>(null);
  const [pendingPair, setPendingPair] = useState<string | null>(null);

  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

  useEffect(() => {
    const trackedIds = new Set(initialTrackedAssets.map((asset) => asset.id));

    setCards((current) => current.filter((card) => trackedIds.has(card.assetId)));
  }, [initialTrackedAssets]);

  const refreshWatchlistCards = useCallback(async () => {
    if (!isSignedIn) {
      return;
    }

    const supabase = createClient();
    const { data: watchlistData } = await supabase.rpc(
      "latest_market_for_my_watchlist"
    );

    if (watchlistData) {
      setCards(normalizeRows(watchlistData));
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

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
          await refreshWatchlistCards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSignedIn, refreshWatchlistCards]);

  const trackedCurrencyPairs = useMemo(
    () => initialTrackedAssets.map((asset) => asset.currencyPair),
    [initialTrackedAssets]
  );

  async function addAssetToWatchlist(asset: {
    symbol: string;
    name: string;
    currencyPair: string;
  }) {
    if (!isSignedIn) {
      setHeatmapStatus("Sign in to add assets to your watchlist.");
      return;
    }

    setPendingPair(asset.currencyPair);
    setHeatmapStatus(`Adding ${asset.symbol} to your watchlist...`);

    try {
      const response = await fetch("/api/assets/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(asset)
      });

      if (!response.ok) {
        throw new Error("Failed to add asset");
      }

      const payload = (await response.json()) as {
        ok: true;
        asset: AssetOption;
        card: MarketCard | null;
      };

      if (payload.card) {
        const nextCard = payload.card;
        setCards((current) => {
          const withoutExisting = current.filter(
            (entry) => entry.assetId !== nextCard.assetId
          );

          return [nextCard, ...withoutExisting];
        });
      } else {
        await refreshWatchlistCards();
      }

      onWatchlistAssetAdded?.({
        asset: payload.asset,
        card: payload.card
      });
      setHeatmapStatus(`${asset.symbol} is now in your watchlist.`);
    } catch (error) {
      console.error("Heatmap watchlist add failed", error);
      setHeatmapStatus(
        `Could not add ${asset.symbol} right now. Some movers are not available as Coinbase USD pairs.`
      );
    } finally {
      setPendingPair(null);
    }
  }

  const rankedCards = [...cards].sort((left, right) => {
    return getMarketGuidance(right).score - getMarketGuidance(left).score;
  });

  const featuredCard = rankedCards[0];
  const featuredGuidance = featuredCard
    ? getMarketGuidance(featuredCard)
    : null;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <MarketHeatmap
          canManageWatchlist={isSignedIn}
          gainers={globalMovers.gainers}
          losers={globalMovers.losers}
          onAddAsset={addAssetToWatchlist}
          trackedCurrencyPairs={trackedCurrencyPairs}
        />
        {heatmapStatus ? (
          <p className="px-2 text-sm text-slate-300/72">{heatmapStatus}</p>
        ) : null}
      </div>

      {featuredCard && featuredGuidance ? (
        <section className="panel-shell rounded-[2.25rem] p-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
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
            </div>

            <Link
              className="inline-flex rounded-full border border-cyan-300/15 bg-cyan-300/[0.08] px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-300/[0.14]"
              href={`/assets/${featuredCard.slug}`}
            >
              Open {featuredCard.symbol} detail page
            </Link>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[0.9fr_0.9fr_1.2fr]">
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
            <div className="rounded-[1.5rem] border border-cyan-300/10 bg-cyan-300/[0.06] p-4">
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
          </div>
        </section>
      ) : (
        <section className="panel-shell rounded-[2.25rem] p-6 text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-100/55">
            Watchlist status
          </p>
          <h3 className="mt-4 font-display text-4xl leading-tight lg:text-5xl">
            {isSignedIn ? "Start building your shortlist." : "Global market board is open."}
          </h3>
          <p className="mt-3 text-base leading-7 text-slate-300/78">
            {isSignedIn
              ? "Use the buttons in the heatmap or the watchlist builder above. As soon as you add a supported asset, it will start appearing in your board here."
              : "You can browse the 24-hour movers without signing in. Sign in only when you want a personal watchlist and live tracked board."}
          </p>
        </section>
      )}

      {rankedCards.length ? (
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
      ) : (
        <div className="panel-shell rounded-[2rem] border-dashed p-8 text-slate-300/74">
          {isSignedIn
            ? "Add a crypto from the heatmap or watchlist builder to start filling your personal board below."
            : "Sign in when you want to build a personal watchlist. Until then, the global 24-hour movers stay visible above."}
        </div>
      )}
    </div>
  );
}
