import { useEffect, useRef, useState } from "react";
import { AreaSeries } from "lightweight-charts";
import type { ISeriesApi } from "lightweight-charts";
import type { BazaarHistoryPoint } from "@/types/api";
import type { PriceStats } from "@/lib/chartStats";
import { useChart } from "@/hooks/useChart";
import { useChartAnnotations } from "@/hooks/useChartAnnotations";
import { formatCoins, toLocalChartTime } from "@/lib/format";

interface PriceHistoryChartProps {
  data: BazaarHistoryPoint[];
  stats?: PriceStats | null;
  showAnnotations?: boolean;
  className?: string;
}

export function PriceHistoryChart({ data, stats, showAnnotations = false, className = "" }: PriceHistoryChartProps) {
  const { containerRef, chartRef } = useChart();
  const buySeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const sellSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  // Create series once
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const buySeries = chart.addSeries(AreaSeries, {
      lineColor: "#5ee7df",
      topColor: "rgba(94, 231, 223, 0.25)",
      bottomColor: "rgba(94, 231, 223, 0.02)",
      lineWidth: 2,
      title: "Buy Price",
      priceFormat: { type: "custom", formatter: (p: number) => formatCoins(p) },
    });

    const sellSeries = chart.addSeries(AreaSeries, {
      lineColor: "#fbbf24",
      topColor: "rgba(251, 191, 36, 0.25)",
      bottomColor: "rgba(251, 191, 36, 0.02)",
      lineWidth: 2,
      title: "Sell Price",
      priceFormat: { type: "custom", formatter: (p: number) => formatCoins(p) },
    });

    buySeriesRef.current = buySeries;
    sellSeriesRef.current = sellSeries;

    return () => {
      buySeriesRef.current = null;
      sellSeriesRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track data updates for debug status
  const [dataStatus, setDataStatus] = useState({ points: 0, lastTs: 0, updatedAt: 0 });
  const [statusAgo, setStatusAgo] = useState(0);

  useEffect(() => {
    if (!dataStatus.updatedAt) return;
    const tick = () => setStatusAgo(Math.floor((Date.now() - dataStatus.updatedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dataStatus.updatedAt]);

  // Update data
  const prevDataLenRef = useRef(0);
  const prevLastTsRef = useRef(0);
  useEffect(() => {
    if (!buySeriesRef.current || !sellSeriesRef.current || !data.length) return;

    const lastPoint = data[data.length - 1]!;
    const isInitialLoad = prevDataLenRef.current === 0;

    // Only update the "Data updated" timer when new points are appended (SSE),
    // not when the array is replaced by a range change
    const isNewData = !isInitialLoad && lastPoint.timestamp > prevLastTsRef.current;
    if (isNewData) {
      setDataStatus({ points: data.length, lastTs: lastPoint.timestamp, updatedAt: Date.now() });
    } else {
      setDataStatus((prev) => ({ ...prev, points: data.length, lastTs: lastPoint.timestamp }));
    }

    prevLastTsRef.current = lastPoint.timestamp;
    prevDataLenRef.current = data.length;

    // Compute global min/max across both series
    const allPrices = data.flatMap((d) => [d.buy_price, d.sell_price]).filter((p) => p > 0);
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const padding = (max - min) * 0.1 || max * 0.05;
    const rangeMin = Math.max(0, min - padding);
    const rangeMax = max + padding;

    const provider = () => ({ priceRange: { minValue: rangeMin, maxValue: rangeMax } });

    buySeriesRef.current.applyOptions({ autoscaleInfoProvider: provider });
    sellSeriesRef.current.applyOptions({ autoscaleInfoProvider: provider });

    buySeriesRef.current.setData(
      data.map((d) => ({ time: toLocalChartTime(d.timestamp), value: d.buy_price }))
    );
    sellSeriesRef.current.setData(
      data.map((d) => ({ time: toLocalChartTime(d.timestamp), value: d.sell_price }))
    );

    // Only fit on initial load — subsequent updates from SSE or time range changes
    // in the parent will pass new data arrays but shouldn't snap the scroll position
    if (isInitialLoad) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Annotations
  useChartAnnotations(chartRef, buySeriesRef, sellSeriesRef, stats ?? null, showAnnotations);

  return (
    <div className={className}>
      <div className="h-72">
        <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-muted/60">
        <span>{dataStatus.points} points</span>
        <span className="w-px h-3 bg-dungeon/30" />
        <span>Latest: {dataStatus.lastTs ? new Date(dataStatus.lastTs).toLocaleTimeString() : "--"}</span>
        <span className="w-px h-3 bg-dungeon/30" />
        <span>Data updated: {dataStatus.updatedAt ? `${statusAgo}s ago` : "--"}</span>
      </div>
    </div>
  );
}
