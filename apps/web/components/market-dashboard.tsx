"use client";

import { useMemo, useState } from "react";

import type { AssetOption, GlobalMover, MarketCard } from "../lib/types";
import { RealtimeMarket } from "./realtime-market";
import { WatchlistManager } from "./watchlist-manager";

type Props = {
  assets: AssetOption[];
  initialCards: MarketCard[];
  globalMovers: {
    gainers: GlobalMover[];
    losers: GlobalMover[];
  };
  selectedAssetIds: string[];
  userId?: string;
};

export function MarketDashboard({
  assets,
  initialCards,
  globalMovers,
  selectedAssetIds,
  userId
}: Props) {
  const [cards, setCards] = useState(initialCards);
  const [trackedAssets, setTrackedAssets] = useState(
    assets.filter((asset) => selectedAssetIds.includes(asset.id))
  );
  const isSignedIn = Boolean(userId);

  const mergedAssets = useMemo(() => {
    const map = new Map(assets.map((asset) => [asset.id, asset]));

    trackedAssets.forEach((asset) => {
      map.set(asset.id, asset);
    });

    return [...map.values()].sort((left, right) =>
      left.symbol.localeCompare(right.symbol)
    );
  }, [assets, trackedAssets]);

  return (
    <>
      {isSignedIn && userId ? (
        <div className="mb-6">
          <WatchlistManager
            assets={mergedAssets}
            onWatchlistAssetAdded={({ asset, card }) => {
              setTrackedAssets((current) => {
                if (current.some((entry) => entry.id === asset.id)) {
                  return current;
                }

                return [...current, asset];
              });

              if (card) {
                setCards((current) => {
                  const withoutExisting = current.filter(
                    (entry) => entry.assetId !== card.assetId
                  );

                  return [card, ...withoutExisting];
                });
              }
            }}
            onWatchlistAssetRemoved={(assetId) => {
              setTrackedAssets((current) =>
                current.filter((asset) => asset.id !== assetId)
              );
              setCards((current) =>
                current.filter((card) => card.assetId !== assetId)
              );
            }}
            selectedAssetIds={trackedAssets.map((asset) => asset.id)}
            userId={userId}
          />
        </div>
      ) : null}

      <RealtimeMarket
        globalMovers={globalMovers}
        initialCards={cards}
        initialTrackedAssets={trackedAssets}
        isSignedIn={isSignedIn}
        onWatchlistAssetAdded={({ asset, card }) => {
          setTrackedAssets((current) => {
            if (current.some((entry) => entry.id === asset.id)) {
              return current;
            }

            return [...current, asset];
          });

          if (card) {
            setCards((current) => {
              const withoutExisting = current.filter(
                (entry) => entry.assetId !== card.assetId
              );

              return [card, ...withoutExisting];
            });
          }
        }}
      />
    </>
  );
}
