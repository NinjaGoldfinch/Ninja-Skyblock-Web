import { useEffect, useRef } from "react";
import { createSeriesMarkers } from "lightweight-charts";
import type { IChartApi, ISeriesApi, IPriceLine, ISeriesMarkersPluginApi, UTCTimestamp, CreatePriceLineOptions } from "lightweight-charts";
import type { PriceStats } from "@/lib/chartStats";
import { formatCoins, toLocalChartTime } from "@/lib/format";

function getAnnotationColors() {
  const isLight = document.documentElement.classList.contains("light");
  return {
    buy: isLight ? "#0d9488" : "#5ee7df",
    buyFaded: isLight ? "#0d948880" : "#5ee7df80",
    buyDim: isLight ? "#0d948840" : "#5ee7df40",
    buyMuted: isLight ? "#0d948899" : "#5ee7df99",
    sell: isLight ? "#b45309" : "#fbbf24",
    sellFaded: isLight ? "#b4530980" : "#fbbf2480",
    sellDim: isLight ? "#b4530940" : "#fbbf2440",
    sellMuted: isLight ? "#b4530999" : "#fbbf2499",
  };
}

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

    const c = getAnnotationColors();

    const addLine = (series: ISeriesApi<"Area">, opts: CreatePriceLineOptions) => {
      const line = series.createPriceLine(opts);
      priceLinesRef.current.push({ series, line });
    };

    if (stats.currentBuy > 0) {
      addLine(buySeries, {
        price: stats.currentBuy,
        color: c.buyFaded,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
        title: "",
      });
    }

    if (stats.currentSell > 0) {
      addLine(sellSeries, {
        price: stats.currentSell,
        color: c.sellFaded,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
        title: "",
      });
    }

    if (stats.highBuyTimestamp > 0 && stats.highBuy !== stats.currentBuy) {
      addLine(buySeries, {
        price: stats.highBuy || 0.01,
        color: c.buyDim,
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: false,
        title: "High",
      });
    }

    if (stats.lowBuyTimestamp > 0 && stats.lowBuy !== stats.currentBuy) {
      addLine(buySeries, {
        price: stats.lowBuy || 0.01,
        color: c.buyDim,
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: false,
        title: "Low",
      });
    }

    if (stats.highSellTimestamp > 0 && stats.highSell !== stats.currentSell) {
      addLine(sellSeries, {
        price: stats.highSell || 0.01,
        color: c.sellDim,
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: false,
        title: "High",
      });
    }

    if (stats.lowSellTimestamp > 0 && stats.lowSell !== stats.currentSell) {
      addLine(sellSeries, {
        price: stats.lowSell || 0.01,
        color: c.sellDim,
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: false,
        title: "Low",
      });
    }

    type MarkerItem = { time: UTCTimestamp; position: "aboveBar" | "belowBar"; color: string; shape: "circle"; text: string; size: number };

    const buyMarkers: MarkerItem[] = [];
    if (stats.highBuyTimestamp > 0) {
      buyMarkers.push({
        time: toLocalChartTime(stats.highBuyTimestamp),
        position: "aboveBar",
        color: c.buy,
        shape: "circle",
        size: 1,
        text: `High ${stats.highBuy === 0 ? "0" : formatCoins(stats.highBuy)}`,
      });
    }
    if (stats.lowBuyTimestamp > 0) {
      buyMarkers.push({
        time: toLocalChartTime(stats.lowBuyTimestamp),
        position: "belowBar",
        color: c.buyMuted,
        shape: "circle",
        size: 1,
        text: `Low ${stats.lowBuy === 0 ? "0" : formatCoins(stats.lowBuy)}`,
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
        color: c.sell,
        shape: "circle",
        size: 1,
        text: `High ${stats.highSell === 0 ? "0" : formatCoins(stats.highSell)}`,
      });
    }
    if (stats.lowSellTimestamp > 0) {
      sellMarkers.push({
        time: toLocalChartTime(stats.lowSellTimestamp),
        position: "belowBar",
        color: c.sellMuted,
        shape: "circle",
        size: 1,
        text: `Low ${stats.lowSell === 0 ? "0" : formatCoins(stats.lowSell)}`,
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
