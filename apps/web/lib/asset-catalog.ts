import type { SearchAssetOption } from "./types";

type CoinbaseProduct = {
  id: string;
  base_currency: string;
  quote_currency: string;
  display_name: string;
  status: string;
  trading_disabled?: boolean;
};

export function toAssetSlug(symbol: string) {
  return symbol.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function pickAccent(symbol: string) {
  const palette = [
    "#22d3ee",
    "#60a5fa",
    "#a78bfa",
    "#f59e0b",
    "#34d399",
    "#fb7185",
    "#f97316",
    "#818cf8"
  ];

  const hash = symbol
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);

  return palette[hash % palette.length];
}

export async function searchCoinbaseAssets(query: string): Promise<SearchAssetOption[]> {
  const response = await fetch("https://api.exchange.coinbase.com/products", {
    headers: {
      Accept: "application/json"
    },
    next: {
      revalidate: 300
    }
  });

  if (!response.ok) {
    throw new Error(`Coinbase products request failed with ${response.status}`);
  }

  const products = (await response.json()) as CoinbaseProduct[];
  const normalizedQuery = query.trim().toLowerCase();

  return products
    .filter(
      (product) =>
        product.quote_currency === "USD" &&
        product.status === "online" &&
        !product.trading_disabled
    )
    .filter((product) => {
      const symbol = product.base_currency.toLowerCase();
      const displayName = product.display_name.toLowerCase();

      return (
        symbol.includes(normalizedQuery) || displayName.includes(normalizedQuery)
      );
    })
    .slice(0, 12)
    .map((product) => ({
      symbol: product.base_currency,
      name: product.display_name.replace("/USD", "").trim(),
      currencyPair: product.id
    }));
}
