const DAY_MS = 24 * 60 * 60 * 1000;

export const VIP_TIERS = Object.freeze([
  { level: 1, minVolume: 0, maker: 0.04, taker: 0.07 },
  { level: 2, minVolume: 100_000, maker: 0.03, taker: 0.06 },
  { level: 3, minVolume: 250_000, maker: 0.02, taker: 0.05 },
  { level: 4, minVolume: 500_000, maker: 0.01, taker: 0.04 },
  { level: 5, minVolume: 1_000_000, maker: 0, taker: 0.03 },
]);

export function summarizeVipTier(trades, now) {
  const volume = trades.reduce((total, trade) => {
    if (!Number.isFinite(trade.timestamp) || trade.timestamp < now - 30 * DAY_MS || trade.timestamp > now ||
        !Number.isFinite(trade.price) || trade.price < 0 || !Number.isFinite(trade.amount) || trade.amount < 0) return total;
    return total + trade.price * trade.amount;
  }, 0);
  const tier = [...VIP_TIERS].reverse().find((item) => volume >= item.minVolume);
  const next = VIP_TIERS[tier.level] || null;
  const progress = next
    ? Math.min(100, Math.max(0, (volume - tier.minVolume) / (next.minVolume - tier.minVolume) * 100))
    : 100;
  return { volume, tier, next, progress };
}
