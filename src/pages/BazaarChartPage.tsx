import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AreaSeries, HistogramSeries } from "lightweight-charts";
import type { ISeriesApi } from "lightweight-charts";
import { ArrowLeft, TrendingUp, TrendingDown, Search, Wifi, WifiOff, Tag, BarChart3 } from "lucide-react";
import { getItems, getBazaarItem } from "@/api/endpoints";
import { useBazaarHistory } from "@/hooks/useBazaarHistory";
import { DataCard } from "@/components/ui/DataCard";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { PriceStatsBar } from "@/components/charts/PriceStatsBar";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { LiveDot } from "@/components/ui/LiveDot";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useChart } from "@/hooks/useChart";
import { useChartAnnotations } from "@/hooks/useChartAnnotations";
import { computePriceStats } from "@/lib/chartStats";
import { formatCoins, toLocalChartTime, calcSpread } from "@/lib/format";
import { getSettings, saveSettings } from "@/lib/settings";
import { useSseLiveStatus } from "@/hooks/useSseLiveStatus";
import type { ItemV2 } from "@/types/api";

type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";
const RANGES: TimeRange[] = ["1h", "6h", "24h", "7d", "30d"];

// --- Item Picker ---

function ItemPicker({
  items,
  selectedId,
  onSelect,
}: {
  items: ItemV2[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return items.slice(0, 50);
    const term = search.toLowerCase();
    return items
      .filter((i) => i.name.toLowerCase().includes(term) || i.id.toLowerCase().includes(term))
      .slice(0, 50);
  }, [items, search]);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId),
    [items, selectedId],
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 bg-nightstone border border-dungeon/50 rounded-xl px-4 py-3 w-full sm:w-80 text-left hover:border-dungeon/70 transition-colors"
      >
        {selectedItem ? (
          <>
            <ItemIcon itemId={selectedItem.id} size={24} />
            <span className="text-body font-medium truncate">{selectedItem.name}</span>
            <span className="text-muted/50 text-xs font-mono ml-auto">{selectedItem.id}</span>
          </>
        ) : (
          <>
            <Search size={16} className="text-muted" />
            <span className="text-muted/50">Select an item...</span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 w-full sm:w-96 z-50 glass-heavy border border-dungeon/40 rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="p-3 border-b border-dungeon/30">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full bg-void/50 border border-dungeon/40 rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted/40 focus:outline-none focus:border-coin/50"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  setOpen(false);
                  setSearch("");
                }}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm transition-colors ${
                  item.id === selectedId
                    ? "bg-coin/8 text-coin"
                    : "text-body hover:bg-dungeon/30"
                }`}
              >
                <ItemIcon itemId={item.id} size={20} />
                <span className="truncate">{item.name}</span>
                <span className="text-muted/40 text-[10px] font-mono ml-auto">{item.id}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-muted text-sm">No items found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Price Chart ---

function PriceChart({
  itemId,
  range,
  showAnnotations,
  stats,
}: {
  itemId: string;
  range: TimeRange;
  showAnnotations: boolean;
  stats: import("@/lib/chartStats").PriceStats | null;
}) {
  const { containerRef, chartRef } = useChart();
  const buySeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const sellSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const { datapoints, loading, error } = useBazaarHistory(itemId, range);

  useChartAnnotations(chartRef, buySeriesRef, sellSeriesRef, stats, showAnnotations);

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

    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      lastValueVisible: false,
    });

    chart.priceScale("").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    buySeriesRef.current = buySeries;
    sellSeriesRef.current = sellSeries;
    volSeriesRef.current = volSeries;

    return () => {
      buySeriesRef.current = null;
      sellSeriesRef.current = null;
      volSeriesRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update data when datapoints change
  const prevLenRef = useRef(0);
  const prevRangeRef = useRef(range);
  useEffect(() => {
    if (!buySeriesRef.current || !sellSeriesRef.current || !volSeriesRef.current) return;
    if (!datapoints.length) return;

    const prevLen = prevLenRef.current;
    const rangeChanged = prevRangeRef.current !== range;
    const isInitialLoad = prevLen === 0;
    prevLenRef.current = datapoints.length;
    prevRangeRef.current = range;

    // Incremental update: if only one new point was appended (SSE extrapolated mode)
    if (prevLen > 0 && datapoints.length === prevLen + 1 && !rangeChanged) {
      const d = datapoints[datapoints.length - 1]!;
      const time = toLocalChartTime(d.timestamp);
      buySeriesRef.current.update({ time, value: d.instant_buy_price });
      sellSeriesRef.current.update({ time, value: d.instant_sell_price });
      volSeriesRef.current.update({
        time,
        value: d.buy_volume + d.sell_volume,
        color: d.buy_volume >= d.sell_volume ? "#5ee7df30" : "#fbbf2430",
      });
      return;
    }

    // Full redraw (initial load, range change, trim)
    const allPrices = datapoints
      .flatMap((d) => [d.instant_buy_price, d.instant_sell_price])
      .filter((p) => p > 0);
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const padding = (max - min) * 0.1 || max * 0.05;
    const rangeMin = Math.max(0, min - padding);
    const rangeMax = max + padding;

    const provider = () => ({ priceRange: { minValue: rangeMin, maxValue: rangeMax } });

    buySeriesRef.current.applyOptions({ autoscaleInfoProvider: provider });
    sellSeriesRef.current.applyOptions({ autoscaleInfoProvider: provider });

    const buyData = datapoints.map((d) => ({
      time: toLocalChartTime(d.timestamp),
      value: d.instant_buy_price,
    }));

    const sellData = datapoints.map((d) => ({
      time: toLocalChartTime(d.timestamp),
      value: d.instant_sell_price,
    }));

    const volData = datapoints.map((d) => ({
      time: toLocalChartTime(d.timestamp),
      value: d.buy_volume + d.sell_volume,
      color: d.buy_volume >= d.sell_volume ? "#5ee7df30" : "#fbbf2430",
    }));

    buySeriesRef.current.setData(buyData);
    sellSeriesRef.current.setData(sellData);
    volSeriesRef.current.setData(volData);

    // Only fit content on initial load or range change, not on SSE-driven cache updates
    if (isInitialLoad || rangeChanged) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [datapoints, range]);

  if (error) return <ErrorState error={error instanceof Error ? error : new Error("Failed to load history")} />;

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-void/60 rounded-2xl">
          <LoadingSkeleton lines={3} />
        </div>
      )}
      <div ref={containerRef} className="w-full h-[420px] rounded-xl overflow-hidden" />
    </div>
  );
}

// --- Main Page ---

export default function BazaarChartPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const itemId = searchParams.get("item") ?? undefined;
  const [range, setRange] = useState<TimeRange>("24h");
  const [showAnnotations, setShowAnnotations] = useState(() => getSettings().showChartAnnotations);
  const [showStats, setShowStats] = useState(() => getSettings().showStatsBar);

  const toggleAnnotations = () => {
    setShowAnnotations((v) => { saveSettings({ showChartAnnotations: !v }); return !v; });
  };
  const toggleStats = () => {
    setShowStats((v) => { saveSettings({ showStatsBar: !v }); return !v; });
  };

  const setItemId = useCallback(
    (id: string) => setSearchParams({ item: id }),
    [setSearchParams],
  );

  // Fetch bazaar-sellable items for picker
  const { data: itemsResp } = useQuery({
    queryKey: ["items"],
    queryFn: () => getItems(),
    staleTime: 5 * 60_000,
  });

  const rawData = itemsResp?.data as unknown as { items: ItemV2[]; count: number } | ItemV2[] | undefined;
  const allItems: ItemV2[] = Array.isArray(rawData) ? rawData : rawData?.items ?? [];
  const bazaarItems = useMemo(
    () => allItems.filter((i) => (i as ItemV2 & { is_bazaar_sellable?: boolean }).is_bazaar_sellable),
    [allItems],
  );

  // Current price data
  const { data: currentResp } = useQuery({
    queryKey: ["bazaar-item", itemId],
    queryFn: () => getBazaarItem(itemId!),
    enabled: !!itemId,
    refetchInterval: 10_000,
  });

  interface CurrentData {
    display_name?: string;
    instant_buy_price: number;
    instant_sell_price: number;
    buy_volume: number;
    sell_volume: number;
  }

  const current = currentResp?.data as unknown as CurrentData | undefined;
  const { sseActive } = useSseLiveStatus(itemId);

  // Compute stats from history (useBazaarHistory caches, so no duplicate fetch)
  const { datapoints: historyDatapoints } = useBazaarHistory(itemId ?? "", range);
  const chartStats = useMemo(
    () => computePriceStats(historyDatapoints.map((d) => ({
      timestamp: d.timestamp,
      buyPrice: d.instant_buy_price,
      sellPrice: d.instant_sell_price,
    }))),
    [historyDatapoints],
  );

  // Prices from API cache (SSE patches this automatically)
  const buyPrice = current?.instant_buy_price ?? 0;
  const sellPrice = current?.instant_sell_price ?? 0;
  const { spread, spreadPercent: spreadPct } = calcSpread(buyPrice, sellPrice);

  const displayName = current?.display_name ?? itemId ?? "";

  return (
    <div className="animate-fade-in">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <Link
            to="/bazaar"
            className="inline-flex items-center gap-2 text-muted hover:text-coin transition-colors text-sm group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Bazaar
          </Link>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl text-gradient-coin font-bold">Price Chart</h1>
              {sseActive ? (
                <span className="flex items-center gap-1.5 text-xs text-green-400">
                  <Wifi size={12} /> <LiveDot />
                  <span className="font-mono">SSE</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-muted/50">
                  <WifiOff size={12} />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Item picker + Range selector */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <ItemPicker items={bazaarItems} selectedId={itemId} onSelect={setItemId} />

          <div className="flex gap-1.5 ml-auto">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3.5 py-2 text-sm rounded-lg border font-medium transition-all ${
                  range === r
                    ? "bg-coin/10 text-coin border-coin/30"
                    : "border-dungeon/40 text-muted hover:text-body hover:border-dungeon/60"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
            <div className="w-px bg-dungeon/30 mx-1" />
            <button
              onClick={toggleAnnotations}
              title="Toggle chart annotations"
              className={`p-2 rounded-lg border transition-all ${
                showAnnotations
                  ? "bg-coin/10 text-coin border-coin/30"
                  : "border-dungeon/40 text-muted hover:text-body hover:border-dungeon/60"
              }`}
            >
              <Tag size={14} />
            </button>
            <button
              onClick={toggleStats}
              title="Toggle stats bar"
              className={`p-2 rounded-lg border transition-all ${
                showStats
                  ? "bg-coin/10 text-coin border-coin/30"
                  : "border-dungeon/40 text-muted hover:text-body hover:border-dungeon/60"
              }`}
            >
              <BarChart3 size={14} />
            </button>
          </div>
        </div>

        {/* Current prices */}
        {itemId && current && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
            {/* Prices */}
            <DataCard>
              <div className="flex items-center gap-3 mb-4">
                <ItemIcon itemId={itemId} size={32} />
                <div className="min-w-0">
                  <p className="text-body-light font-medium text-sm truncate">{displayName}</p>
                  <p className="text-muted/50 text-[10px] font-mono">{itemId}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-enchant/10 flex items-center justify-center">
                      <TrendingUp size={12} className="text-enchant" />
                    </div>
                    <span className="text-xs text-muted font-medium">Buy</span>
                  </div>
                  <PriceDisplay amount={buyPrice} size="md" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-gold/10 flex items-center justify-center">
                      <TrendingDown size={12} className="text-gold" />
                    </div>
                    <span className="text-xs text-muted font-medium">Sell</span>
                  </div>
                  <PriceDisplay amount={sellPrice} size="md" />
                </div>
              </div>
            </DataCard>

            {/* Flip Profit */}
            <DataCard>
              <div className="flex items-center justify-between mb-3">
                <p className="text-muted text-[10px] uppercase tracking-wider font-medium">Flip Profit</p>
                <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${
                  spreadPct >= 0
                    ? "text-green-400 bg-green-500/10"
                    : "text-damage bg-damage/10"
                }`}>
                  {spreadPct >= 0 ? "+" : ""}{spreadPct.toFixed(2)}%
                </span>
              </div>
              <PriceDisplay amount={Math.abs(spread)} size="lg" />
              <div className="mt-3 pt-3 border-t border-dungeon/20 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted text-[10px] uppercase tracking-wider mb-0.5">Per Stack (64)</p>
                  <p className={`font-mono text-xs font-medium ${spread >= 0 ? "text-green-400" : "text-damage"}`}>
                    {formatCoins(Math.abs(spread * 64))}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-[10px] uppercase tracking-wider mb-0.5">Per 1k</p>
                  <p className={`font-mono text-xs font-medium ${spread >= 0 ? "text-green-400" : "text-damage"}`}>
                    {formatCoins(Math.abs(spread * 1000))}
                  </p>
                </div>
              </div>
            </DataCard>

            {/* Volume */}
            <DataCard>
              <p className="text-muted text-[10px] uppercase tracking-wider font-medium mb-3">Volume</p>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted font-medium">Buy</span>
                    <span className="text-body font-mono text-sm font-medium">{formatCoins(current.buy_volume)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-dungeon/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-enchant/50"
                      style={{ width: `${Math.min(100, (current.buy_volume / Math.max(current.buy_volume, current.sell_volume, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted font-medium">Sell</span>
                    <span className="text-body font-mono text-sm font-medium">{formatCoins(current.sell_volume)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-dungeon/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gold/50"
                      style={{ width: `${Math.min(100, (current.sell_volume / Math.max(current.buy_volume, current.sell_volume, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-dungeon/20">
                <div className="flex items-center justify-between">
                  <span className="text-muted text-[10px] uppercase tracking-wider">Ratio</span>
                  <span className="text-body font-mono text-xs">
                    {current.sell_volume > 0 ? (current.buy_volume / current.sell_volume).toFixed(2) : "--"}x
                  </span>
                </div>
              </div>
            </DataCard>
          </div>
        )}

        {/* Stats bar */}
        {showStats && itemId && chartStats && <PriceStatsBar stats={chartStats} />}

        {/* Chart */}
        {itemId ? (
          <DataCard>
            <PriceChart itemId={itemId} range={range} showAnnotations={showAnnotations} stats={chartStats} />
            <div className="flex items-center gap-4 mt-3 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-enchant rounded-full" /> Buy Price
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-gold rounded-full" /> Sell Price
              </span>
            </div>
          </DataCard>
        ) : (
          <DataCard>
            <div className="text-center py-20 text-muted">
              Select an item above to view price charts.
            </div>
          </DataCard>
        )}
      </div>
    </div>
  );
}
