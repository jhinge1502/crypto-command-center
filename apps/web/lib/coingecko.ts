import type { GlobalMover, GlobalMoverDetail } from "./types";

type CoinGeckoMarketRow = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  market_cap_rank: number | null;
  market_cap: number | null;
  total_volume: number | null;
};

type CoinGeckoDetailResponse = {
  id: string;
  symbol: string;
  name: string;
  image: {
    large?: string;
    small?: string;
  };
  market_cap_rank: number | null;
  market_data?: {
    current_price?: {
      usd?: number;
    };
    price_change_percentage_24h?: number | null;
    market_cap?: {
      usd?: number;
    };
    total_volume?: {
      usd?: number;
    };
    high_24h?: {
      usd?: number;
    };
    low_24h?: {
      usd?: number;
    };
    circulating_supply?: number | null;
    fully_diluted_valuation?: {
      usd?: number;
    };
  };
};

function toCurrencyPair(symbol: string) {
  return `${symbol.toUpperCase()}-USD`;
}

async function fetchMarketsPage(page: number) {
  const params = new URLSearchParams({
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: "250",
    page: page.toString(),
    sparkline: "false",
    price_change_percentage: "24h"
  });

  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?${params.toString()}`,
    {
      headers: {
        Accept: "application/json"
      },
      next: {
        revalidate: 60
      }
    }
  );

  if (!response.ok) {
    throw new Error(`CoinGecko markets request failed with ${response.status}`);
  }

  return (await response.json()) as CoinGeckoMarketRow[];
}

export async function fetchGlobalMovers(): Promise<{
  gainers: GlobalMover[];
  losers: GlobalMover[];
}> {
  const pages = await Promise.all([fetchMarketsPage(1), fetchMarketsPage(2)]);

  const rows = pages
    .flat()
    .filter((row) => typeof row.price_change_percentage_24h === "number")
    .map((row) => ({
      id: row.id,
      symbol: row.symbol.toUpperCase(),
      name: row.name,
      image: row.image,
      currencyPair: toCurrencyPair(row.symbol),
      detailHref: `/market/${row.id}`,
      currentPrice: row.current_price,
      priceChangePercentage24h: Number(row.price_change_percentage_24h ?? 0),
      marketCapRank: row.market_cap_rank,
      marketCap: row.market_cap,
      totalVolume: row.total_volume
    }));

  const gainers = [...rows]
    .filter((row) => row.priceChangePercentage24h > 0)
    .sort(
      (left, right) =>
        right.priceChangePercentage24h - left.priceChangePercentage24h
    )
    .slice(0, 6);

  const losers = [...rows]
    .filter((row) => row.priceChangePercentage24h < 0)
    .sort(
      (left, right) =>
        left.priceChangePercentage24h - right.priceChangePercentage24h
    )
    .slice(0, 6);

  return { gainers, losers };
}

export async function fetchGlobalMoverDetail(
  coinId: string
): Promise<GlobalMoverDetail> {
  const params = new URLSearchParams({
    localization: "false",
    tickers: "false",
    market_data: "true",
    community_data: "false",
    developer_data: "false",
    sparkline: "false"
  });

  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}?${params.toString()}`,
    {
      headers: {
        Accept: "application/json"
      },
      next: {
        revalidate: 60
      }
    }
  );

  if (!response.ok) {
    throw new Error(`CoinGecko detail request failed with ${response.status}`);
  }

  const data = (await response.json()) as CoinGeckoDetailResponse;
  const symbol = data.symbol.toUpperCase();

  return {
    id: data.id,
    symbol,
    name: data.name,
    image: data.image?.large ?? data.image?.small ?? null,
    currencyPair: toCurrencyPair(symbol),
    currentPrice: Number(data.market_data?.current_price?.usd ?? 0),
    priceChangePercentage24h: Number(
      data.market_data?.price_change_percentage_24h ?? 0
    ),
    marketCapRank: data.market_cap_rank,
    marketCap: data.market_data?.market_cap?.usd ?? null,
    totalVolume: data.market_data?.total_volume?.usd ?? null,
    high24h: data.market_data?.high_24h?.usd ?? null,
    low24h: data.market_data?.low_24h?.usd ?? null,
    circulatingSupply: data.market_data?.circulating_supply ?? null,
    fullyDilutedValuation:
      data.market_data?.fully_diluted_valuation?.usd ?? null
  };
}
