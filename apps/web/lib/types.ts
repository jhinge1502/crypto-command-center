export type MarketCard = {
  assetId: string;
  slug: string;
  symbol: string;
  name: string;
  currencyPair: string;
  accent: string;
  observedAt: string;
  spotPrice: number;
  buyPrice: number;
  sellPrice: number;
  spreadPct: number;
  priceChangePct: number;
  priceDirection: "up" | "down" | "flat";
};

export type AssetOption = {
  id: string;
  slug: string;
  symbol: string;
  name: string;
  currencyPair: string;
  accent: string;
};

export type GlobalMover = {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  currencyPair: string;
  detailHref: string;
  currentPrice: number;
  priceChangePercentage24h: number;
  marketCapRank: number | null;
  marketCap: number | null;
  totalVolume: number | null;
};

export type SearchAssetOption = {
  symbol: string;
  name: string;
  currencyPair: string;
};

export type GlobalMoverDetail = {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  currencyPair: string;
  currentPrice: number;
  priceChangePercentage24h: number;
  marketCapRank: number | null;
  marketCap: number | null;
  totalVolume: number | null;
  high24h: number | null;
  low24h: number | null;
  circulatingSupply: number | null;
  fullyDilutedValuation: number | null;
};
