import { fetchMarketQuote } from "./coinbase";
import { env } from "./env";
import { supabase } from "./supabase";

type AssetRow = {
  id: string;
  name: string;
  symbol: string;
  currency_pair: string;
};

async function pollOnce() {
  const { data: assets, error } = await supabase
    .from("assets")
    .select("id, name, symbol, currency_pair");

  if (error) {
    throw error;
  }

  for (const asset of (assets ?? []) as AssetRow[]) {
    const quote = await fetchMarketQuote(asset.currency_pair);

    const { data: previousSnapshots, error: previousError } = await supabase
      .from("market_snapshots")
      .select("spot_price")
      .eq("asset_id", asset.id)
      .order("observed_at", { ascending: false })
      .limit(1);

    if (previousError) {
      throw previousError;
    }

    const previousSpotPrice = previousSnapshots?.[0]
      ? Number(previousSnapshots[0].spot_price)
      : null;

    const priceChangePct =
      previousSpotPrice && previousSpotPrice !== 0
        ? ((quote.spotPrice - previousSpotPrice) / previousSpotPrice) * 100
        : 0;

    const priceDirection =
      priceChangePct > 0.05 ? "up" : priceChangePct < -0.05 ? "down" : "flat";

    const { error: insertError } = await supabase.from("market_snapshots").insert({
      asset_id: asset.id,
      observed_at: quote.observedAt,
      spot_price: quote.spotPrice,
      buy_price: quote.buyPrice,
      sell_price: quote.sellPrice,
      spread_pct: quote.spreadPct,
      price_change_pct: priceChangePct,
      price_direction: priceDirection
    });

    if (insertError) {
      throw insertError;
    }

    const { error: updateError } = await supabase
      .from("assets")
      .update({ last_polled_at: new Date().toISOString() })
      .eq("id", asset.id);

    if (updateError) {
      throw updateError;
    }

    console.log(
      `Updated ${asset.symbol} at ${quote.observedAt} (${quote.spotPrice.toFixed(2)})`
    );
  }
}

async function main() {
  console.log("Worker started.");
  await pollOnce();
  setInterval(() => {
    void pollOnce().catch((error) => {
      console.error("Polling failed:", error);
    });
  }, env.pollIntervalMs);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
