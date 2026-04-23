"use client";

import { useEffect, useState } from "react";

import { createClient } from "../lib/supabase/browser";
import type { AssetOption, MarketCard, SearchAssetOption } from "../lib/types";

type Props = {
  assets: AssetOption[];
  selectedAssetIds: string[];
  userId: string;
  onWatchlistAssetAdded?: (payload: {
    asset: AssetOption;
    card: MarketCard | null;
  }) => void;
  onWatchlistAssetRemoved?: (assetId: string) => void;
};

export function WatchlistManager({
  assets,
  selectedAssetIds,
  userId,
  onWatchlistAssetAdded,
  onWatchlistAssetRemoved
}: Props) {
  const [selectedIds, setSelectedIds] = useState(new Set(selectedAssetIds));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchAssetOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds(new Set(selectedAssetIds));
  }, [selectedAssetIds]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      setSearchStatus(null);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/assets/search?q=${encodeURIComponent(trimmedQuery)}`,
          {
            signal: controller.signal
          }
        );

        if (!response.ok) {
          throw new Error("Search request failed");
        }

        const payload = (await response.json()) as {
          results: SearchAssetOption[];
        };

        setSearchResults(payload.results);
        setSearchStatus(payload.results.length ? null : "No matching assets found.");
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        console.error("Asset search failed", error);
        setSearchResults([]);
        setSearchStatus("Search is unavailable right now.");
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

  async function addAssetToWatchlist(asset: {
    symbol: string;
    name: string;
    currencyPair: string;
  }) {
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

    return (await response.json()) as {
      ok: true;
      asset: AssetOption;
      card: MarketCard | null;
    };
  }

  async function toggleWatchlist(assetId: string) {
    const supabase = createClient();
    const nextSelected = new Set(selectedIds);
    const isSelected = nextSelected.has(assetId);
    const asset = assets.find((candidate) => candidate.id === assetId);

    setSavingId(assetId);

    try {
      if (isSelected) {
        nextSelected.delete(assetId);
        setSelectedIds(nextSelected);

        await supabase
          .from("user_watchlist_assets")
          .delete()
          .eq("user_id", userId)
          .eq("asset_id", assetId);

        onWatchlistAssetRemoved?.(assetId);
      } else {
        if (!asset) {
          throw new Error("Missing asset metadata");
        }

        nextSelected.add(assetId);
        setSelectedIds(nextSelected);

        const payload = await addAssetToWatchlist({
          symbol: asset.symbol,
          name: asset.name,
          currencyPair: asset.currencyPair
        });

        onWatchlistAssetAdded?.({
          asset: payload.asset,
          card: payload.card
        });
      }
    } finally {
      setSavingId(null);
    }
  }

  async function addSearchAsset(asset: SearchAssetOption) {
    const key = `search-${asset.currencyPair}`;
    setSavingId(key);
    setSearchStatus("Adding asset to your watchlist...");

    try {
      const payload = await addAssetToWatchlist(asset);

      setQuery("");
      setSearchResults([]);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.add(payload.asset.id);
        return next;
      });
      setSearchStatus(`${asset.symbol} was added to your watchlist.`);
      onWatchlistAssetAdded?.({
        asset: payload.asset,
        card: payload.card
      });
    } catch (error) {
      console.error("Adding search asset failed", error);
      setSearchStatus("Could not add that asset right now.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="panel-shell rounded-[2.2rem] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-100/45">
            Personalization
          </p>
          <h3 className="mt-1 font-display text-2xl text-white">
            Build your watchlist
          </h3>
        </div>
        <p className="text-sm text-slate-300/72">
          {selectedIds.size} {selectedIds.size === 1 ? "asset" : "assets"} in
          view.
        </p>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/72">
        Search Coinbase-listed USD pairs or use the quick picks below to shape
        your private command center.
      </p>

      <div className="mt-5 rounded-[1.7rem] border border-cyan-300/10 bg-white/[0.03] p-4">
        <label className="text-xs uppercase tracking-[0.24em] text-cyan-100/45">
          Search any crypto
        </label>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row">
          <input
            className="min-w-0 flex-1 rounded-full border border-cyan-300/12 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by symbol or name, like pepe or avalanche"
            type="text"
            value={query}
          />
          <div className="rounded-full border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-300">
            {isSearching ? "Searching..." : "Matches update as you type"}
          </div>
        </div>

        {searchResults.length ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {searchResults.map((asset) => (
              <button
                className="rounded-full border border-cyan-300/12 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
                disabled={savingId === `search-${asset.currencyPair}`}
                key={asset.currencyPair}
                onClick={() => addSearchAsset(asset)}
                type="button"
              >
                {asset.symbol} - {asset.name}
              </button>
            ))}
          </div>
        ) : null}

        {searchStatus ? (
          <p className="mt-3 text-sm text-slate-300/72">{searchStatus}</p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {assets.map((asset) => {
          const isSelected = selectedIds.has(asset.id);

          return (
            <button
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                isSelected
                  ? "border-cyan-200/30 bg-cyan-300 text-slate-950 shadow-sm"
                  : "border-cyan-300/12 bg-white/[0.03] text-slate-200 hover:border-cyan-300/30 hover:bg-white/[0.06]"
              }`}
              disabled={savingId === asset.id}
              key={asset.id}
              onClick={() => toggleWatchlist(asset.id)}
              type="button"
            >
              {asset.symbol} - {asset.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
