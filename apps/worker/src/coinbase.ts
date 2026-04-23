import { env } from "./env";

type CoinbasePriceResponse = {
  data: {
    amount: string;
    currency: string;
  };
};

async function fetchPrice(
  currencyPair: string,
  priceType: "spot" | "buy" | "sell"
) {
  const response = await fetch(
    `${env.coinbaseApiBaseUrl}/${currencyPair}/${priceType}`
  );

  if (!response.ok) {
    throw new Error(`Coinbase ${priceType} request failed with ${response.status}`);
  }

  const json = (await response.json()) as CoinbasePriceResponse;

  return Number(json.data.amount);
}

export async function fetchMarketQuote(currencyPair: string) {
  const [spotPrice, buyPrice, sellPrice] = await Promise.all([
    fetchPrice(currencyPair, "spot"),
    fetchPrice(currencyPair, "buy"),
    fetchPrice(currencyPair, "sell")
  ]);

  const spreadPct =
    spotPrice === 0 ? 0 : Math.abs((buyPrice - sellPrice) / spotPrice) * 100;

  return {
    observedAt: new Date().toISOString(),
    spotPrice,
    buyPrice,
    sellPrice,
    spreadPct
  };
}
