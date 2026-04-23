import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  pickAccent,
  toAssetSlug
} from "../../../../lib/asset-catalog";
import { createClient as createAuthClient } from "../../../../lib/supabase/server";
import type { MarketCard } from "../../../../lib/types";

type AssetRow = {
  id: string;
  slug: string;
  symbol: string;
  name: string;
  currency_pair: string;
  accent: string;
};

type CoinbasePriceResponse = {
  data: {
    amount: string;
  };
};

async function fetchPrice(
  currencyPair: string,
  priceType: "spot" | "buy" | "sell"
) {
  const response = await fetch(
    `https://api.coinbase.com/v2/prices/${currencyPair}/${priceType}`,
    {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`Coinbase ${priceType} request failed with ${response.status}`);
  }

  const json = (await response.json()) as CoinbasePriceResponse;
  return Number(json.data.amount);
}

async function fetchMarketQuote(currencyPair: string) {
  const [spotPrice, buyPrice, sellPrice] = await Promise.all([
    fetchPrice(currencyPair, "spot"),
    fetchPrice(currencyPair, "buy"),
    fetchPrice(currencyPair, "sell")
  ]);

  return {
    observedAt: new Date().toISOString(),
    spotPrice,
    buyPrice,
    sellPrice,
    spreadPct:
      spotPrice === 0 ? 0 : Math.abs((buyPrice - sellPrice) / spotPrice) * 100
  };
}

export async function POST(request: Request) {
  const authClient = await createAuthClient();
  const {
    data: { user }
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    symbol?: string;
    name?: string;
    currencyPair?: string;
  };

  const symbol = body.symbol?.trim().toUpperCase();
  const name = body.name?.trim();
  const currencyPair = body.currencyPair?.trim().toUpperCase();

  if (!symbol || !name || !currencyPair) {
    return NextResponse.json({ error: "Missing asset fields" }, { status: 400 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Missing server environment variables" },
      { status: 500 }
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: existingAsset, error: existingAssetError } = await adminClient
    .from("assets")
    .select("id, slug, symbol, name, currency_pair, accent")
    .eq("symbol", symbol)
    .maybeSingle();

  if (existingAssetError) {
    return NextResponse.json({ error: existingAssetError.message }, { status: 500 });
  }

  let asset = existingAsset as AssetRow | null;

  if (!asset) {
    const { data: insertedAsset, error: insertAssetError } = await adminClient
      .from("assets")
      .insert({
        slug: toAssetSlug(symbol),
        symbol,
        name,
        currency_pair: currencyPair,
        accent: pickAccent(symbol)
      })
      .select("id, slug, symbol, name, currency_pair, accent")
      .single();

    if (insertAssetError) {
      return NextResponse.json({ error: insertAssetError.message }, { status: 500 });
    }

    asset = insertedAsset as AssetRow;
  }

  const { error: watchlistError } = await adminClient
    .from("user_watchlist_assets")
    .upsert(
      {
        user_id: user.id,
        asset_id: asset.id
      },
      {
        onConflict: "user_id,asset_id"
      }
    );

  if (watchlistError) {
    return NextResponse.json({ error: watchlistError.message }, { status: 500 });
  }

  let card: MarketCard | null = null;

  try {
    const { data: previousSnapshot } = await adminClient
      .from("market_snapshots")
      .select("spot_price")
      .eq("asset_id", asset.id)
      .order("observed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const quote = await fetchMarketQuote(asset.currency_pair);
    const previousSpotPrice = previousSnapshot?.spot_price
      ? Number(previousSnapshot.spot_price)
      : null;

    const priceChangePct =
      previousSpotPrice && previousSpotPrice !== 0
        ? ((quote.spotPrice - previousSpotPrice) / previousSpotPrice) * 100
        : 0;

    const priceDirection =
      priceChangePct > 0.05 ? "up" : priceChangePct < -0.05 ? "down" : "flat";

    await adminClient.from("market_snapshots").insert({
      asset_id: asset.id,
      observed_at: quote.observedAt,
      spot_price: quote.spotPrice,
      buy_price: quote.buyPrice,
      sell_price: quote.sellPrice,
      spread_pct: quote.spreadPct,
      price_change_pct: priceChangePct,
      price_direction: priceDirection
    });

    await adminClient
      .from("assets")
      .update({ last_polled_at: quote.observedAt })
      .eq("id", asset.id);

    card = {
      assetId: asset.id,
      slug: asset.slug,
      symbol: asset.symbol,
      name: asset.name,
      currencyPair: asset.currency_pair,
      accent: asset.accent,
      observedAt: quote.observedAt,
      spotPrice: quote.spotPrice,
      buyPrice: quote.buyPrice,
      sellPrice: quote.sellPrice,
      spreadPct: quote.spreadPct,
      priceChangePct,
      priceDirection
    };
  } catch (error) {
    console.error("Immediate watchlist snapshot failed", error);
  }

  return NextResponse.json({
    ok: true,
    asset: {
      id: asset.id,
      slug: asset.slug,
      symbol: asset.symbol,
      name: asset.name,
      currencyPair: asset.currency_pair,
      accent: asset.accent
    },
    card
  });
}
