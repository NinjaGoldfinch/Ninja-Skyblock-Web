import { useEffect, useRef } from "react";
import { createSeriesMarkers } from "lightweight-charts";
import type { IChartApi, ISeriesApi, IPriceLine, ISeriesMarkersPluginApi, UTCTimestamp, CreatePriceLineOptions } from "lightweight-charts";
import type { PriceStats } from "@/lib/chartStats";
import { formatCoins, toLocalChartTime } from "@/lib/format";

export function useChartAnnotations(
  _chartRef: React.RefObject<IChartApi | null>,
  buySeriesRef: React.RefObject<ISeriesApi<"Area"> | null>,
  sellSeriesRef: React.RefObject<ISeriesApi<"Area"> | null>,
  stats: PriceStats | null,
  enabled: boolean,
) {
  const priceLinesRef = useRef<{ series: ISeriesApi<"Area">; line: IPriceLine }[]>([]);
  const buyMarkersRef = useRef<ISeriesMarkersPluginApi<unknown> | null>(null);
  const sellMarkersRef = useRef<ISeriesMarkersPluginApi<unknown> | null>(null);

  useEffect(() => {
    // Clean up previous
    for (const { series, line } of priceLinesRef.current) {
      try { series.removePriceLine(line); } catch { /* series may be gone */ }
    }
    priceLinesRef.current = [];

    buyMarkersRef.current?.setMarkers([]);
    sellMarkersRef.current?.setMarkers([]);

    const buySeries = buySeriesRef.current;
    const sellSeries = sellSeriesRef.current;
    if (!enabled || !stats || !buySeries || !sellSeries) return;

    const addLine = (series: ISeriesApi<"Area">, opts: CreatePriceLineOptions) => {
      const line = series.createPriceLine(opts);
      priceLinesRef.current.push({ series, line });
    };

    // Current price lines (dashed) — axis label hidden to avoid duplicating the series' own last-value label
    if (stats.currentBuy > 0) {
      addLine(buySeries, {
        price: stats.currentBuy,
        color: "#5ee7df80",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
        title: "",
      });
    }

    if (stats.currentSell > 0) {
      addLine(sellSeries, {
        price: stats.currentSell,
        color: "#fbbf2480",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
        title: "",
      });
    }

    // High/low lines (dotted)
    if (stats.highBuy > 0 && stats.highBuy !== stats.currentBuy) {
      addLine(buySeries, {
        price: stats.highBuy,
        color: "#5ee7df40",
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: false,
        title: "High",
      });
    }

    if (stats.lowSell > 0 && stats.lowSell !== stats.currentSell) {
      addLine(sellSeries, {
        price: stats.lowSell,
        color: "#fbbf2440",
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: false,
        title: "Low",
      });
    }

    // Markers for high/low points — small circles with price labels
    type MarkerItem = { time: UTCTimestamp; position: "aboveBar" | "belowBar"; color: string; shape: "circle"; text: string; size: number };

    const buyMarkers: MarkerItem[] = [];
    if (stats.highBuyTimestamp > 0) {
      buyMarkers.push({
        time: toLocalChartTime(stats.highBuyTimestamp),
        position: "aboveBar",
        color: "#5ee7df",
        shape: "circle",
        size: 1,
        text: `High ${formatCoins(stats.highBuy)}`,
      });
    }
    if (stats.lowBuyTimestamp > 0) {
      buyMarkers.push({
        time: toLocalChartTime(stats.lowBuyTimestamp),
        position: "belowBar",
        color: "#5ee7df99",
        shape: "circle",
        size: 1,
        text: `Low ${formatCoins(stats.lowBuy)}`,
      });
    }
    buyMarkers.sort((a, b) => (a.time as number) - (b.time as number));

    if (!buyMarkersRef.current) {
      buyMarkersRef.current = createSeriesMarkers(buySeries, buyMarkers) as ISeriesMarkersPluginApi<unknown>;
    } else {
      buyMarkersRef.current.setMarkers(buyMarkers);
    }

    const sellMarkers: MarkerItem[] = [];
    if (stats.highSellTimestamp > 0) {
      sellMarkers.push({
        time: toLocalChartTime(stats.highSellTimestamp),
        position: "aboveBar",
        color: "#fbbf24",
        shape: "circle",
        size: 1,
        text: `High ${formatCoins(stats.highSell)}`,
      });
    }
    if (stats.lowSellTimestamp > 0) {
      sellMarkers.push({
        time: toLocalChartTime(stats.lowSellTimestamp),
        position: "belowBar",
        color: "#fbbf2499",
        shape: "circle",
        size: 1,
        text: `Low ${formatCoins(stats.lowSell)}`,
      });
    }
    sellMarkers.sort((a, b) => (a.time as number) - (b.time as number));

    if (!sellMarkersRef.current) {
      sellMarkersRef.current = createSeriesMarkers(sellSeries, sellMarkers) as ISeriesMarkersPluginApi<unknown>;
    } else {
      sellMarkersRef.current.setMarkers(sellMarkers);
    }
  }, [stats, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}
