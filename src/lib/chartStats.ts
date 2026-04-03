export interface NormalizedPricePoint {
  timestamp: number;
  buyPrice: number;
  sellPrice: number;
}

export interface PriceStats {
  highBuy: number;
  lowBuy: number;
  highSell: number;
  lowSell: number;
  avgBuy: number;
  avgSell: number;
  currentBuy: number;
  currentSell: number;
  spread: number;
  pctChangeBuy: number;
  pctChangeSell: number;
  highBuyTimestamp: number;
  lowBuyTimestamp: number;
  highSellTimestamp: number;
  lowSellTimestamp: number;
}

export function computePriceStats(points: NormalizedPricePoint[]): PriceStats | null {
  if (!points.length) return null;

  let highBuy = -Infinity, lowBuy = Infinity;
  let highSell = -Infinity, lowSell = Infinity;
  let highBuyTs = 0, lowBuyTs = 0, highSellTs = 0, lowSellTs = 0;
  let sumBuy = 0, sumSell = 0, countBuy = 0, countSell = 0;

  for (const p of points) {
    sumBuy += p.buyPrice;
    countBuy++;
    if (p.buyPrice > highBuy) { highBuy = p.buyPrice; highBuyTs = p.timestamp; }
    if (p.buyPrice < lowBuy) { lowBuy = p.buyPrice; lowBuyTs = p.timestamp; }

    sumSell += p.sellPrice;
    countSell++;
    if (p.sellPrice > highSell) { highSell = p.sellPrice; highSellTs = p.timestamp; }
    if (p.sellPrice < lowSell) { lowSell = p.sellPrice; lowSellTs = p.timestamp; }
  }

  if (countBuy === 0 && countSell === 0) return null;

  const first = points[0]!;
  const last = points[points.length - 1]!;

  const pctChange = (start: number, end: number) =>
    start > 0 ? ((end - start) / start) * 100 : 0;

  return {
    highBuy: highBuy === -Infinity ? 0 : highBuy,
    lowBuy: lowBuy === Infinity ? 0 : lowBuy,
    highSell: highSell === -Infinity ? 0 : highSell,
    lowSell: lowSell === Infinity ? 0 : lowSell,
    avgBuy: countBuy > 0 ? sumBuy / countBuy : 0,
    avgSell: countSell > 0 ? sumSell / countSell : 0,
    currentBuy: last.buyPrice,
    currentSell: last.sellPrice,
    spread: last.sellPrice - last.buyPrice,
    pctChangeBuy: pctChange(first.buyPrice, last.buyPrice),
    pctChangeSell: pctChange(first.sellPrice, last.sellPrice),
    highBuyTimestamp: highBuyTs,
    lowBuyTimestamp: lowBuyTs,
    highSellTimestamp: highSellTs,
    lowSellTimestamp: lowSellTs,
  };
}
