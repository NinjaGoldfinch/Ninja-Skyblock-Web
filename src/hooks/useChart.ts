import { useEffect, useRef } from "react";
import { createChart, CrosshairMode } from "lightweight-charts";
import type { IChartApi, TickMarkType } from "lightweight-charts";

export interface ChartOptions {
  height?: number;
}

/** Format a local-adjusted UTC timestamp for display */
function formatChartTime(timeSec: number): string {
  const date = new Date(timeSec * 1000);
  const day = date.getUTCDate();
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const year = date.getUTCFullYear();
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} · ${day} ${month} ${year}`;
}

function tickMarkFormatter(time: number, tickMarkType: TickMarkType): string {
  const date = new Date(time * 1000);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");

  // TickMarkType: 0=Year, 1=Month, 2=DayOfMonth, 3=Time, 4=TimeWithSeconds
  if (tickMarkType <= 1) {
    const day = date.getUTCDate();
    const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    const year = date.getUTCFullYear();
    return `${day} ${month} ${year}`;
  }
  if (tickMarkType === 2) {
    const day = date.getUTCDate();
    const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    return `${day} ${month}`;
  }
  return `${hh}:${mm}`;
}

const CHART_THEME = {
  layout: { background: { color: "transparent" }, textColor: "#6b7394", fontFamily: "DM Sans", attributionLogo: false },
  grid: { vertLines: { color: "#1e213020" }, horzLines: { color: "#1e213040" } },
  timeScale: { timeVisible: true, secondsVisible: false, borderColor: "#1e2130", tickMarkFormatter, rightOffset: 0, shiftVisibleRangeOnNewBar: true },
  rightPriceScale: { borderColor: "#1e2130" },
  crosshair: { mode: CrosshairMode.Normal },
  localization: { timeFormatter: formatChartTime },
} as const;

/**
 * Creates a lightweight-charts instance, handles resize (throttled), and cleans up on unmount.
 * Returns refs to the container div and the chart API.
 */
export function useChart(options?: ChartOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      ...CHART_THEME,
      width: el.clientWidth,
      height: options?.height,
    });

    chartRef.current = chart;

    // Throttle resize to prevent excessive redraws
    let resizeRaf = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        if (containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
    });
    observer.observe(el);

    return () => {
      cancelAnimationFrame(resizeRaf);
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { containerRef, chartRef };
}
