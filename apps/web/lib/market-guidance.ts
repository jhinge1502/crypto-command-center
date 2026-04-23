import type { MarketCard } from "./types";

export type MarketGuidance = {
  action: string;
  summary: string;
  statusLabel: string;
  statusTone: "bullish" | "neutral" | "cautious";
  note: string;
  score: number;
};

export function getMarketGuidance(card: MarketCard): MarketGuidance {
  const change = card.priceChangePct ?? 0;
  const spread = card.spreadPct ?? 0;
  const volatility = Math.abs(change);

  let score = 50 + change * 6 - spread * 2;
  score = Math.max(0, Math.min(100, score));

  let action = "Hold steady";
  let summary = `${card.symbol} is moving, but not in a way that screams for a fast reaction.`;
  let note = `Spread is sitting at ${spread.toFixed(2)}%, so execution looks manageable.`;
  let statusLabel: MarketGuidance["statusLabel"] = "Neutral flow";
  let statusTone: MarketGuidance["statusTone"] = "neutral";

  if (change >= 3) {
    action = "Momentum watch";
    summary = `${card.symbol} is breaking higher with real energy, so this belongs near the top of the board.`;
    note = `Price is up ${change.toFixed(2)}% since the last worker snapshot.`;
    statusLabel = "Risk-on";
    statusTone = "bullish";
  } else if (change >= 1) {
    action = "Green tape";
    summary = `${card.symbol} is grinding higher and still looks constructive if you want relative strength on screen.`;
    note = `The move is positive without getting too stretched.`;
    statusLabel = "Bullish";
    statusTone = "bullish";
  } else if (change <= -3) {
    action = "Volatility spike";
    summary = `${card.symbol} is taking a hard hit, so this is more about managing risk than chasing a rebound.`;
    note = `Price is down ${Math.abs(change).toFixed(2)}% since the previous snapshot.`;
    statusLabel = "Risk-off";
    statusTone = "cautious";
  } else if (change <= -1) {
    action = "Cooling off";
    summary = `${card.symbol} is fading and losing momentum, so caution makes more sense than conviction right now.`;
    note = `The tape is softer, but not in full breakdown mode.`;
    statusLabel = "Cautious";
    statusTone = "cautious";
  } else if (spread > 1.5) {
    action = "Wide spread";
    summary = `${card.symbol} is relatively flat, but the spread is wide enough that execution matters more than signal.`;
    note = `Watch the buy and sell gap before treating this as a clean entry.`;
    statusLabel = "Thin market";
    statusTone = "cautious";
  } else if (volatility < 0.3) {
    action = "Range watch";
    summary = `${card.symbol} is barely moving, which makes this a monitor-first asset rather than a headline mover.`;
    note = `Low movement and a contained spread keep this in neutral territory.`;
  }

  return {
    action,
    summary,
    statusLabel,
    statusTone,
    note,
    score
  };
}

export function getStatusToneClasses(tone: MarketGuidance["statusTone"]) {
  switch (tone) {
    case "bullish":
      return "border-emerald-300/20 bg-emerald-300/10 text-emerald-100";
    case "cautious":
      return "border-rose-300/20 bg-rose-300/10 text-rose-100";
    default:
      return "border-cyan-300/20 bg-cyan-300/10 text-cyan-100";
  }
}

export function getDirectionClasses(direction: MarketCard["priceDirection"]) {
  switch (direction) {
    case "up":
      return "text-emerald-300";
    case "down":
      return "text-rose-300";
    default:
      return "text-slate-300";
  }
}

export function getChangeClasses(changePct: number) {
  if (changePct > 0) {
    return "text-emerald-300";
  }

  if (changePct < 0) {
    return "text-rose-300";
  }

  return "text-slate-300";
}

export function getChangeBadgeClasses(changePct: number) {
  if (changePct > 0) {
    return "border-emerald-300/18 bg-emerald-300/10";
  }

  if (changePct < 0) {
    return "border-rose-300/18 bg-rose-300/10";
  }

  return "border-white/8 bg-white/5";
}

export function formatPrice(value: number) {
  if (value >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2
    }).format(value);
  }

  if (value >= 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6
  }).format(value);
}
