import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AreaSeries, HistogramSeries } from "lightweight-charts";
import type { ISeriesApi } from "lightweight-charts";
import {
  ArrowLeft, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  ShoppingCart, Store, Search, Tag, BarChart3,
} from "lucide-react";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { CopyButton } from "@/components/ui/CopyButton";
import { getBazaarItem, getItems } from "@/api/endpoints";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { DataCard } from "@/components/ui/DataCard";
import { PriceStatsBar } from "@/components/charts/PriceStatsBar";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { useChart } from "@/hooks/useChart";
import { useChartAnnotations } from "@/hooks/useChartAnnotations";
import { computePriceStats } from "@/lib/chartStats";
import { formatNumber, formatCoins, calcSpread, toLocalChartTime } from "@/lib/format";
import { getSettings, saveSettings } from "@/lib/settings";
import { useItemNames } from "@/hooks/useItemNames";
import { useBazaarHistory } from "@/hooks/useBazaarHistory";
import { useSseChangeLog } from "@/hooks/useSseChangeLog";
import type { ItemV2 } from "@/types/api";

type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";
const RANGES: TimeRange[] = ["1h", "6h", "24h", "7d", "30d"];

interface OrderEntry {
  amount: number;
  price_per_unit: number;
  orders: number;
}

// V2 API response — field names use Hypixel's internal naming (inverted from user perspective)
interface V2BazaarItemRaw {
  item_id: string;
  display_name?: string;
  instant_buy_price: number;
  instant_sell_price: number;
  avg_buy_price: number;
  avg_sell_price: number;
  buy_volume: number;
  sell_volume: number;
  buy_orders: number;
  sell_orders: number;
  buy_moving_week: number;
  sell_moving_week: number;
  top_buy_orders: OrderEntry[];
  top_sell_orders: OrderEntry[];
}

/** Derive display values from the V2 order book.
 *  V2 API uses Hypixel's internal naming (inverted from user perspective):
 *    top_sell_orders = sell orders on the book = what user buys from (cheapest first)
 *    top_buy_orders  = buy orders on the book = what user sells to (highest first)
 *    instant_buy_price = cheapest sell order price (what user pays to instant-buy)
 *    instant_sell_price = highest buy order price (what user gets to instant-sell) */
function deriveItemData(raw: V2BazaarItemRaw) {
  const buyFromOrders = raw.top_sell_orders ?? [];
  const sellToOrders = raw.top_buy_orders ?? [];

  const buyPrice = raw.instant_buy_price ?? buyFromOrders[0]?.price_per_unit ?? 0;
  const sellPrice = raw.instant_sell_price ?? sellToOrders[0]?.price_per_unit ?? 0;

  const { spread, spreadPercent } = calcSpread(buyPrice, sellPrice);

  const buyOrderCount = buyFromOrders.reduce((sum, o) => sum + o.orders, 0);
  const buyItemCount = buyFromOrders.reduce((sum, o) => sum + o.amount, 0);

  const sellOrderCount = sellToOrders.reduce((sum, o) => sum + o.orders, 0);
  const sellItemCount = sellToOrders.reduce((sum, o) => sum + o.amount, 0);

  const avgBuyPrice = buyItemCount > 0
    ? buyFromOrders.reduce((sum, o) => sum + o.price_per_unit * o.amount, 0) / buyItemCount
    : 0;
  const avgSellPrice = sellItemCount > 0
    ? sellToOrders.reduce((sum, o) => sum + o.price_per_unit * o.amount, 0) / sellItemCount
    : 0;

  return {
    itemId: raw.item_id,
    buyPrice,
    sellPrice,
    spread,
    spreadPercent,
    buyOrderCount,
    buyItemCount,
    sellOrderCount,
    sellItemCount,
    avgBuyPrice,
    avgSellPrice,
    buyVolume: raw.buy_volume ?? 0,
    sellVolume: raw.sell_volume ?? 0,
    topBuyOrders: buyFromOrders,
    topSellOrders: sellToOrders,
  };
}

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
      <div className="flex items-center gap-1 group/picker">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2.5 bg-nightstone border border-dungeon/50 rounded-xl px-3.5 py-2.5 w-full sm:w-64 text-left hover:border-dungeon/70 transition-colors"
        >
          {selectedItem ? (
            <>
              <ItemIcon itemId={selectedItem.id} size={20} />
              <span className="text-body font-medium text-sm truncate">{selectedItem.name}</span>
              <Search size={12} className="text-muted/40 ml-auto shrink-0" />
            </>
          ) : (
            <>
              <Search size={14} className="text-muted" />
              <span className="text-muted/50 text-sm">Switch item...</span>
            </>
          )}
        </button>
        {selectedItem && (
          <div className="opacity-0 group-hover/picker:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <CopyButton text={selectedItem.id} />
          </div>
        )}
      </div>

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
            {filtered.map((fItem) => (
              <button
                key={fItem.id}
                onClick={() => {
                  onSelect(fItem.id);
                  setOpen(false);
                  setSearch("");
                }}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm transition-colors ${
                  fItem.id === selectedId
                    ? "bg-coin/8 text-coin"
                    : "text-body hover:bg-dungeon/30"
                }`}
              >
                <ItemIcon itemId={fItem.id} size={20} />
                <span className="truncate">{fItem.name}</span>
                <span className="text-muted/40 text-[10px] font-mono ml-auto">{fItem.id}</span>
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

// --- Chart colors (adapt to theme) ---

function getSeriesColors() {
  const isLight = document.documentElement.classList.contains("light");
  return {
    buyLine: isLight ? "#0d9488" : "#5ee7df",
    buyFillTop: isLight ? "rgba(13, 148, 136, 0.15)" : "rgba(94, 231, 223, 0.25)",
    buyFillBot: isLight ? "rgba(13, 148, 136, 0.01)" : "rgba(94, 231, 223, 0.02)",
    sellLine: isLight ? "#b45309" : "#fbbf24",
    sellFillTop: isLight ? "rgba(180, 83, 9, 0.15)" : "rgba(251, 191, 36, 0.25)",
    sellFillBot: isLight ? "rgba(180, 83, 9, 0.01)" : "rgba(251, 191, 36, 0.02)",
    volBuy: isLight ? "#0d948830" : "#5ee7df30",
    volSell: isLight ? "#b4530930" : "#fbbf2430",
  };
}

// --- Price Chart with Volume ---

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

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const colors = getSeriesColors();

    const buySeries = chart.addSeries(AreaSeries, {
      lineColor: colors.buyLine,
      topColor: colors.buyFillTop,
      bottomColor: colors.buyFillBot,
      lineWidth: 2,
      title: "Buy Price",
      priceFormat: { type: "custom", formatter: (p: number) => formatCoins(p) },
    });

    const sellSeries = chart.addSeries(AreaSeries, {
      lineColor: colors.sellLine,
      topColor: colors.sellFillTop,
      bottomColor: colors.sellFillBot,
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

  const prevLenRef = useRef(0);
  const prevRangeRef = useRef(range);
  useEffect(() => {
    if (!buySeriesRef.current || !sellSeriesRef.current || !volSeriesRef.current) return;
    if (!datapoints.length) return;

    const colors = getSeriesColors();
    const prevLen = prevLenRef.current;
    const rangeChanged = prevRangeRef.current !== range;
    const isInitialLoad = prevLen === 0;
    prevLenRef.current = datapoints.length;
    prevRangeRef.current = range;

    if (prevLen > 0 && datapoints.length === prevLen + 1 && !rangeChanged) {
      const d = datapoints[datapoints.length - 1]!;
      const time = toLocalChartTime(d.timestamp);
      buySeriesRef.current.update({ time, value: d.instant_buy_price });
      sellSeriesRef.current.update({ time, value: d.instant_sell_price });
      volSeriesRef.current.update({
        time,
        value: d.buy_volume + d.sell_volume,
        color: d.buy_volume >= d.sell_volume ? colors.volBuy : colors.volSell,
      });
      return;
    }

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
      color: d.buy_volume >= d.sell_volume ? colors.volBuy : colors.volSell,
    }));

    buySeriesRef.current.setData(buyData);
    sellSeriesRef.current.setData(sellData);
    volSeriesRef.current.setData(volData);

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
      <div className="flex items-center gap-4 mt-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-enchant rounded-full" /> Buy Price
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-gold rounded-full" /> Sell Price
        </span>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function BazaarItemPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [showAnnotations, setShowAnnotations] = useState(() => getSettings().showChartAnnotations);
  const [showStats, setShowStats] = useState(() => getSettings().showStatsBar);
  const { getName } = useItemNames();

  const toggleAnnotations = () => {
    setShowAnnotations((v) => { saveSettings({ showChartAnnotations: !v }); return !v; });
  };
  const toggleStats = () => {
    setShowStats((v) => { saveSettings({ showStatsBar: !v }); return !v; });
  };

  // Fetch bazaar-sellable items for the item picker
  const { data: itemsResp } = useQuery({
    queryKey: ["items"],
    queryFn: () => getItems(),
    staleTime: 5 * 60_000,
  });

  const rawItemsList = itemsResp?.data as unknown as { items: ItemV2[]; count: number } | ItemV2[] | undefined;
  const allItems: ItemV2[] = Array.isArray(rawItemsList) ? rawItemsList : rawItemsList?.items ?? [];
  const bazaarItems = useMemo(
    () => allItems.filter((i) => (i as ItemV2 & { is_bazaar_sellable?: boolean }).is_bazaar_sellable),
    [allItems],
  );

  const handleItemSwitch = useCallback(
    (id: string) => navigate(`/bazaar/${id}`),
    [navigate],
  );

  const {
    data: itemResp,
    isLoading: itemLoading,
    isError: itemError,
    error: itemErr,
  } = useQuery({
    queryKey: ["bazaar-item", itemId],
    queryFn: () => getBazaarItem(itemId!),
    enabled: !!itemId,
  });

  const rawItem = itemResp?.data as unknown as V2BazaarItemRaw | undefined;

  const changeLog = useSseChangeLog(itemId);

  // History
  const { datapoints: historyDatapoints, loading: historyLoading, error: historyErr } = useBazaarHistory(itemId, timeRange);

  const priceStats = useMemo(
    () => computePriceStats(historyDatapoints.map((d) => ({
      timestamp: d.timestamp,
      buyPrice: d.instant_buy_price,
      sellPrice: d.instant_sell_price,
    }))),
    [historyDatapoints],
  );

  if (itemLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <LoadingSkeleton lines={4} />
      </div>
    );
  }

  if (itemError) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <ErrorState error={itemErr instanceof Error ? itemErr : new Error("Failed to fetch bazaar item")} />
      </div>
    );
  }

  if (!rawItem) return null;

  const item = deriveItemData(rawItem);
  const maxVol = Math.max(item.buyVolume, item.sellVolume, 1);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Back + header */}
      <div className="space-y-4">
        <Link
          to="/bazaar"
          className="inline-flex items-center gap-2 text-muted hover:text-coin transition-colors text-sm group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Bazaar
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <ItemIcon itemId={item.itemId} size={48} />
            <div>
              <h1 className="font-display text-4xl text-gradient-coin font-bold">
                {rawItem?.display_name ?? getName(item.itemId)}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5 group/id">
                <span className="text-muted font-mono text-xs bg-dungeon/30 px-2 py-0.5 rounded-md truncate max-w-48" title={item.itemId}>{item.itemId}</span>
                <div className="opacity-0 group-hover/id:opacity-100 transition-opacity">
                  <CopyButton text={item.itemId} />
                </div>
              </div>
            </div>
          </div>
          <ItemPicker items={bazaarItems} selectedId={itemId} onSelect={handleItemSwitch} />
        </div>
      </div>

      {/* Price overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
        {/* Buy side */}
        <DataCard className={item.buyPrice > 0 ? "border-green-500/10" : ""}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-green-400" />
            </div>
            <span className="text-sm font-medium text-body">Buy Price</span>
          </div>
          {item.buyPrice > 0 ? (
            <PriceDisplay amount={item.buyPrice} size="lg" />
          ) : (
            <span className="text-muted/50 text-lg">No buy orders</span>
          )}
          <div className="mt-4 pt-3 border-t border-dungeon/20 grid grid-cols-3 gap-3">
            <div>
              <p className="text-muted text-[10px] uppercase tracking-wider mb-0.5">Orders</p>
              <p className="text-body font-mono text-sm">{formatNumber(item.buyOrderCount)}</p>
            </div>
            <div>
              <p className="text-muted text-[10px] uppercase tracking-wider mb-0.5">Items</p>
              <p className="text-body font-mono text-sm">{formatNumber(item.buyItemCount)}</p>
            </div>
            <div>
              <p className="text-muted text-[10px] uppercase tracking-wider mb-0.5">Avg Price</p>
              {item.avgBuyPrice > 0
                ? <PriceDisplay amount={item.avgBuyPrice} size="sm" className="text-xs" />
                : <span className="text-muted/40 font-mono text-sm">--</span>
              }
            </div>
          </div>
        </DataCard>

        {/* Sell side */}
        <DataCard className={item.sellPrice > 0 ? "border-enchant/10" : ""}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-enchant/10 flex items-center justify-center">
              <TrendingDown size={16} className="text-enchant" />
            </div>
            <span className="text-sm font-medium text-body">Sell Price</span>
          </div>
          {item.sellPrice > 0 ? (
            <PriceDisplay amount={item.sellPrice} size="lg" />
          ) : (
            <span className="text-muted/50 text-lg">No sell orders</span>
          )}
          <div className="mt-4 pt-3 border-t border-dungeon/20 grid grid-cols-3 gap-3">
            <div>
              <p className="text-muted text-[10px] uppercase tracking-wider mb-0.5">Orders</p>
              <p className="text-body font-mono text-sm">{formatNumber(item.sellOrderCount)}</p>
            </div>
            <div>
              <p className="text-muted text-[10px] uppercase tracking-wider mb-0.5">Items</p>
              <p className="text-body font-mono text-sm">{formatNumber(item.sellItemCount)}</p>
            </div>
            <div>
              <p className="text-muted text-[10px] uppercase tracking-wider mb-0.5">Avg Price</p>
              {item.avgSellPrice > 0
                ? <PriceDisplay amount={item.avgSellPrice} size="sm" className="text-xs" />
                : <span className="text-muted/40 font-mono text-sm">--</span>
              }
            </div>
          </div>
        </DataCard>

        {/* Flip Profit */}
        {item.buyPrice > 0 && item.sellPrice > 0 && (
          <DataCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  item.spreadPercent >= 0 ? "bg-green-500/10" : "bg-damage/10"
                }`}>
                  {item.spreadPercent >= 0
                    ? <ArrowUpRight size={16} className="text-green-400" />
                    : <ArrowDownRight size={16} className="text-damage" />
                  }
                </div>
                <span className="text-sm font-medium text-body">Flip Profit</span>
              </div>
              <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${
                item.spreadPercent >= 0
                  ? "text-green-400 bg-green-500/10"
                  : "text-damage bg-damage/10"
              }`}>
                {item.spreadPercent >= 0 ? "+" : ""}{item.spreadPercent.toFixed(2)}%
              </span>
            </div>
            <PriceDisplay amount={Math.abs(item.spread)} size="lg" />
            <div className="mt-4 pt-3 border-t border-dungeon/20 grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted text-[10px] uppercase tracking-wider mb-0.5">Per Stack (64)</p>
                <p className={`font-mono text-sm font-medium ${item.spread >= 0 ? "text-green-400" : "text-damage"}`}>
                  {formatCoins(Math.abs(item.spread * 64))}
                </p>
              </div>
              <div>
                <p className="text-muted text-[10px] uppercase tracking-wider mb-0.5">Per 1k</p>
                <p className={`font-mono text-sm font-medium ${item.spread >= 0 ? "text-green-400" : "text-damage"}`}>
                  {formatCoins(Math.abs(item.spread * 1000))}
                </p>
              </div>
            </div>
          </DataCard>
        )}

        {/* Volume */}
        <DataCard>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-coin/10 flex items-center justify-center">
              <BarChart3 size={16} className="text-coin" />
            </div>
            <span className="text-sm font-medium text-body">Volume</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted font-medium">Buy</span>
                <span className="text-body font-mono text-sm font-medium">{formatCoins(item.buyVolume)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-dungeon/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-enchant/50"
                  style={{ width: `${Math.min(100, (item.buyVolume / maxVol) * 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted font-medium">Sell</span>
                <span className="text-body font-mono text-sm font-medium">{formatCoins(item.sellVolume)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-dungeon/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gold/50"
                  style={{ width: `${Math.min(100, (item.sellVolume / maxVol) * 100)}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-dungeon/20">
            <div className="flex items-center justify-between">
              <span className="text-muted text-[10px] uppercase tracking-wider">Ratio</span>
              <span className="text-body font-mono text-xs">
                {item.sellVolume > 0 ? (item.buyVolume / item.sellVolume).toFixed(2) : "--"}x
              </span>
            </div>
          </div>
        </DataCard>
      </div>

      {/* Price history chart */}
      <DataCard title="Price History">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {RANGES.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 text-sm rounded-lg border transition-all duration-200 font-medium ${
                timeRange === range
                  ? "bg-coin/10 text-coin border-coin/30"
                  : "bg-void/40 border-dungeon/40 text-muted hover:text-body hover:border-dungeon/60"
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}

          <div className="flex gap-1.5 ml-auto">
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

        {showStats && priceStats && <PriceStatsBar stats={priceStats} className="mb-4" />}

        {itemId ? (
          <PriceChart itemId={itemId} range={timeRange} showAnnotations={showAnnotations} stats={priceStats} />
        ) : (
          <div className="text-center py-10 text-muted">No item selected.</div>
        )}

        {!historyLoading && !historyErr && historyDatapoints.length === 0 && (
          <div className="text-center py-10 text-muted">
            No history data available for this time range.
          </div>
        )}
      </DataCard>

      {/* Order tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataCard>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={14} className="text-green-400" />
            <h3 className="font-display text-sm uppercase tracking-[0.12em] text-gradient-coin font-semibold">Top Buy Orders</h3>
          </div>
          <div className="rounded-xl overflow-hidden border border-dungeon/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted bg-void/40">
                  <th className="text-left py-2.5 px-4 text-xs font-medium">Price</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium">Quantity</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium">Orders</th>
                </tr>
              </thead>
              <tbody>
                {item.topBuyOrders.slice(0, 10).map((order, i) => (
                  <tr key={i} className="border-t border-dungeon/20 hover:bg-coin/3 transition-colors">
                    <td className="py-2.5 px-4">
                      <PriceDisplay amount={order.price_per_unit} size="sm" />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-body">
                      {formatNumber(order.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-muted">
                      {formatNumber(order.orders)}
                    </td>
                  </tr>
                ))}
                {item.topBuyOrders.length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center text-muted text-sm">Nobody is buying this item</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </DataCard>

        <DataCard>
          <div className="flex items-center gap-2 mb-4">
            <Store size={14} className="text-enchant" />
            <h3 className="font-display text-sm uppercase tracking-[0.12em] text-gradient-coin font-semibold">Top Sell Orders</h3>
          </div>
          <div className="rounded-xl overflow-hidden border border-dungeon/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted bg-void/40">
                  <th className="text-left py-2.5 px-4 text-xs font-medium">Price</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium">Quantity</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium">Orders</th>
                </tr>
              </thead>
              <tbody>
                {item.topSellOrders.slice(0, 10).map((order, i) => (
                  <tr key={i} className="border-t border-dungeon/20 hover:bg-coin/3 transition-colors">
                    <td className="py-2.5 px-4">
                      <PriceDisplay amount={order.price_per_unit} size="sm" />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-body">
                      {formatNumber(order.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-muted">
                      {formatNumber(order.orders)}
                    </td>
                  </tr>
                ))}
                {item.topSellOrders.length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center text-muted text-sm">Nobody is selling this item</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </DataCard>
      </div>

      {/* SSE Change Log */}
      {changeLog.length > 0 && (
        <DataCard title="SSE Change Log">
          <div className="bg-void/40 border border-dungeon/30 rounded-xl overflow-y-auto max-h-64">
            <table className="w-full text-xs">
              <thead className="sticky top-0 glass border-b border-dungeon/30">
                <tr className="text-muted text-left">
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Field</th>
                  <th className="px-4 py-2.5 font-medium text-right">Old</th>
                  <th className="px-4 py-2.5 font-medium text-right">New</th>
                  <th className="px-4 py-2.5 font-medium text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {changeLog.flatMap((entry, ei) =>
                  entry.changes.map((c, ci) => {
                    const diff = c.newValue - c.oldValue;
                    const pct = c.oldValue !== 0 ? (diff / c.oldValue) * 100 : 0;
                    const isPrice = c.field.includes("price");
                    const color = diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-muted";
                    const label = c.field.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

                    return (
                      <tr key={`${ei}-${ci}`} className="border-t border-dungeon/15 hover:bg-coin/3 transition-colors">
                        {ci === 0 ? (
                          <td className="px-4 py-2 text-muted whitespace-nowrap" rowSpan={entry.changes.length}>
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </td>
                        ) : null}
                        <td className="px-4 py-2 text-body">{label}</td>
                        <td className="px-4 py-2 font-mono text-muted text-right">
                          {isPrice ? formatCoins(c.oldValue) : formatNumber(c.oldValue, 1)}
                        </td>
                        <td className={`px-4 py-2 font-mono text-right font-medium ${color}`}>
                          {isPrice ? formatCoins(c.newValue) : formatNumber(c.newValue, 1)}
                        </td>
                        <td className={`px-4 py-2 font-mono text-right ${color}`}>
                          {diff > 0 ? "+" : ""}{isPrice ? formatCoins(Math.abs(diff)) : formatNumber(Math.abs(diff), 1)}
                          {pct !== 0 && (
                            <span className="block text-[10px] text-muted/60">
                              {pct > 0 ? "+" : ""}{pct.toFixed(3)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </DataCard>
      )}

      {/* Raw JSON (reflects SSE patches) */}
      <JsonViewer data={rawItem} title="Raw API Response (Live)" />
    </div>
  );
}
