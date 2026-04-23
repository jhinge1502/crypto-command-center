type CoinbaseProductResponse = {
  id: string;
  base_currency: string;
  quote_currency: string;
  base_increment: string;
  quote_increment: string;
  display_name: string;
  status: string;
  status_message: string;
  post_only: boolean;
  limit_only: boolean;
  cancel_only: boolean;
  auction_mode: boolean;
};

type CoinbaseBookResponse = {
  bids: [string, string, number][];
  asks: [string, string, number][];
  sequence: number;
  time: string;
};

type CoinbaseTradeResponse = Array<{
  trade_id: number;
  side: "buy" | "sell";
  size: string;
  price: string;
  time: string;
}>;

export type OrderBookLevel = {
  price: number;
  size: number;
  orderCount: number;
};

export type OrderBookSummary = {
  bestBid: number;
  bestAsk: number;
  spreadAbsolute: number;
  spreadPct: number;
  topBidVolume: number;
  topAskVolume: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  observedAt: string;
};

export type ProductDetails = {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  baseIncrement: string;
  quoteIncrement: string;
  displayName: string;
  status: string;
  statusMessage: string;
  postOnly: boolean;
  limitOnly: boolean;
  cancelOnly: boolean;
  auctionMode: boolean;
};

export type RecentTrade = {
  tradeId: number;
  side: "buy" | "sell";
  size: number;
  price: number;
  time: string;
};

const baseUrl = "https://api.exchange.coinbase.com";

async function fetchJson<T>(path: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: "application/json"
    },
    next: {
      revalidate: 15
    }
  });

  if (!response.ok) {
    throw new Error(`Coinbase Exchange request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

function normalizeLevels(levels: [string, string, number][]) {
  return levels.map(([price, size, orderCount]) => ({
    price: Number(price),
    size: Number(size),
    orderCount
  }));
}

export async function fetchProductDetails(productId: string): Promise<ProductDetails> {
  const data = await fetchJson<CoinbaseProductResponse>(`/products/${productId}`);

  return {
    id: data.id,
    baseCurrency: data.base_currency,
    quoteCurrency: data.quote_currency,
    baseIncrement: data.base_increment,
    quoteIncrement: data.quote_increment,
    displayName: data.display_name,
    status: data.status,
    statusMessage: data.status_message,
    postOnly: data.post_only,
    limitOnly: data.limit_only,
    cancelOnly: data.cancel_only,
    auctionMode: data.auction_mode
  };
}

export async function fetchOrderBook(productId: string): Promise<OrderBookSummary> {
  const data = await fetchJson<CoinbaseBookResponse>(
    `/products/${productId}/book?level=2`
  );

  const bids = normalizeLevels(data.bids).slice(0, 10);
  const asks = normalizeLevels(data.asks).slice(0, 10);
  const bestBid = bids[0]?.price ?? 0;
  const bestAsk = asks[0]?.price ?? 0;
  const spreadAbsolute = bestAsk - bestBid;
  const spreadPct = bestBid === 0 ? 0 : (spreadAbsolute / bestBid) * 100;
  const topBidVolume = bids.reduce((sum, level) => sum + level.size, 0);
  const topAskVolume = asks.reduce((sum, level) => sum + level.size, 0);

  return {
    bestBid,
    bestAsk,
    spreadAbsolute,
    spreadPct,
    topBidVolume,
    topAskVolume,
    bids,
    asks,
    observedAt: data.time
  };
}

export async function fetchRecentTrades(productId: string): Promise<RecentTrade[]> {
  const data = await fetchJson<CoinbaseTradeResponse>(
    `/products/${productId}/trades?limit=10`
  );

  return data.map((trade) => ({
    tradeId: trade.trade_id,
    side: trade.side,
    size: Number(trade.size),
    price: Number(trade.price),
    time: trade.time
  }));
}
