import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ShoppingCart, Store, Tag, BarChart3 } from "lucide-react";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { getBazaarItem } from "@/api/endpoints";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { DataCard } from "@/components/ui/DataCard";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { PriceHistoryChart } from "@/components/charts/PriceHistoryChart";
import { PriceStatsBar } from "@/components/charts/PriceStatsBar";
import { computePriceStats } from "@/lib/chartStats";
import { formatNumber, formatCoins, calcSpread } from "@/lib/format";
import { getSettings, saveSettings } from "@/lib/settings";
import { useItemNames } from "@/hooks/useItemNames";
import { useBazaarHistory } from "@/hooks/useBazaarHistory";
import { useSseLiveStatus } from "@/hooks/useSseLiveStatus";
import { useSseChangeLog } from "@/hooks/useSseChangeLog";
import { useNextUpdate } from "@/hooks/useNextUpdate";
import type { BazaarHistoryPoint } from "@/types/api";

type TimeRange = "1h" | "6h" | "24h" | "7d";

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
  // Swap to user perspective
  const buyFromOrders = raw.top_sell_orders ?? [];  // user buys from sell orders
  const sellToOrders = raw.top_buy_orders ?? [];    // user sells to buy orders

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
    topBuyOrders: buyFromOrders,   // orders you can buy from (sell orders)
    topSellOrders: sellToOrders,   // orders you can sell to (buy orders)
  };
}

export default function BazaarItemPage() {
  const { itemId } = useParams<{ itemId: string }>();
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

  const {
    data: itemResp,
    isLoading: itemLoading,
    isError: itemError,
    error: itemErr,
    isFetching,
  } = useQuery({
    queryKey: ["bazaar-item", itemId],
    queryFn: () => getBazaarItem(itemId!),
    enabled: !!itemId,
  });

  const rawItem = itemResp?.data as unknown as V2BazaarItemRaw | undefined;
  const meta = itemResp?.meta;

  const { sseActive, sseAgo: sseStreamAgo } = useSseLiveStatus("__bazaar_listing__");
  const { sseAgo: sseItemAgo } = useSseLiveStatus(itemId);
  const changeLog = useSseChangeLog(itemId);
  const itemQueryKey = useMemo(() => ["bazaar-item", itemId] as const, [itemId]);
  const nextUpdateIn = useNextUpdate(itemQueryKey);

  // History via V2 endpoint (SSE extrapolated mode patches this cache)
  const {
    datapoints: historyDatapoints,
    loading: historyLoading,
    error: historyErr,
  } = useBazaarHistory(itemId, timeRange as "1h" | "6h" | "24h" | "7d");

  const historyError = !!historyErr;

  // Convert V2 datapoints to the BazaarHistoryPoint format used by PriceHistoryChart
  const filteredHistory: BazaarHistoryPoint[] = useMemo(() => {
    return historyDatapoints.map((d) => ({
      timestamp: d.timestamp,
      buy_price: d.instant_buy_price,
      sell_price: d.instant_sell_price,
    }));
  }, [historyDatapoints]);

  const priceStats = useMemo(
    () => computePriceStats(filteredHistory.map((d) => ({
      timestamp: d.timestamp,
      buyPrice: d.buy_price,
      sellPrice: d.sell_price,
    }))),
    [filteredHistory],
  );

  if (itemLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <LoadingSkeleton lines={4} />
      </div>
    );
  }

  if (itemError) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <ErrorState error={itemErr instanceof Error ? itemErr : new Error("Failed to fetch bazaar item")} />
      </div>
    );
  }

  if (!rawItem) return null;

  const item = deriveItemData(rawItem);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
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
              <span className="text-muted font-mono text-xs bg-dungeon/30 px-2 py-0.5 rounded-md">{item.itemId}</span>
            </div>
          </div>
          <StatusBadge meta={meta} isRefetching={isFetching} sseActive={sseActive} sseAgo={sseStreamAgo} sseItemAgo={sseItemAgo} nextUpdateIn={nextUpdateIn} />
        </div>
      </div>

      {/* Price overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
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
      </div>

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

      {/* Price history chart */}
      <DataCard title="Price History">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {(["1h", "6h", "24h", "7d"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 text-sm rounded-lg border transition-all duration-200 font-medium ${
                timeRange === range
                  ? "bg-coin/10 text-coin border-coin/30"
                  : "bg-void/40 border-dungeon/40 text-muted hover:text-body hover:border-dungeon/60"
              }`}
            >
              {range}
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

        {historyLoading && <LoadingSkeleton lines={3} />}
        {historyError && <ErrorState error={historyErr instanceof Error ? historyErr : new Error("Failed to fetch history")} />}
        {!historyLoading && !historyError && filteredHistory.length > 0 && (
          <PriceHistoryChart data={filteredHistory} stats={priceStats} showAnnotations={showAnnotations} />
        )}
        {!historyLoading && !historyError && filteredHistory.length === 0 && (
          <div className="text-center py-10 text-muted">
            No history data available for this time range.
          </div>
        )}
      </DataCard>

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
