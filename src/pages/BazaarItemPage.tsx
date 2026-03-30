import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ShoppingCart, Store } from "lucide-react";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { getBazaarItem, getBazaarHistory } from "@/api/endpoints";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { DataCard } from "@/components/ui/DataCard";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { PriceHistoryChart } from "@/components/charts/PriceHistoryChart";
import { formatNumber } from "@/lib/format";
import { useItemNames } from "@/hooks/useItemNames";
import type { BazaarHistoryPoint } from "@/types/api";

type TimeRange = "1h" | "6h" | "24h" | "7d";

const TIME_RANGE_MS: Record<TimeRange, number> = {
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

interface OrderEntry {
  amount: number;
  price_per_unit: number;
  orders: number;
}

// Raw API response — field names are inverted from the user's perspective
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

/** Derive all display values from the order book directly.
 *  API field names are inverted: API "sell" = user buying, API "buy" = user selling. */
function deriveItemData(raw: V2BazaarItemRaw) {
  // Swap: API top_sell_orders are what the user buys from, API top_buy_orders are what the user sells to
  const sellOrders = raw.top_sell_orders ?? []; // user buys from these
  const buyOrders = raw.top_buy_orders ?? [];   // user sells to these

  // Buy price = highest buy order (first entry, sorted highest first)
  const buyPrice = buyOrders[0]?.price_per_unit ?? 0;

  // Sell price = cheapest sell order (first entry, sorted lowest first)
  const sellPrice = sellOrders[0]?.price_per_unit ?? 0;

  const spread = buyPrice - sellPrice;
  const spreadPercent = sellPrice > 0 ? (spread / sellPrice) * 100 : 0;

  // Buy volume: total orders and total items from sell orders (what's available to buy)
  const buyOrderCount = sellOrders.reduce((sum, o) => sum + o.orders, 0);
  const buyItemCount = sellOrders.reduce((sum, o) => sum + o.amount, 0);

  // Sell volume: total orders and total items from buy orders (demand to sell into)
  const sellOrderCount = buyOrders.reduce((sum, o) => sum + o.orders, 0);
  const sellItemCount = buyOrders.reduce((sum, o) => sum + o.amount, 0);

  // Average prices weighted by amount
  const avgBuyPrice = buyItemCount > 0
    ? sellOrders.reduce((sum, o) => sum + o.price_per_unit * o.amount, 0) / buyItemCount
    : 0;
  const avgSellPrice = sellItemCount > 0
    ? buyOrders.reduce((sum, o) => sum + o.price_per_unit * o.amount, 0) / sellItemCount
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
    // Keep order arrays in user perspective for tables
    topBuyOrders: sellOrders,   // orders you can buy from
    topSellOrders: buyOrders,   // orders you can sell to
  };
}

export default function BazaarItemPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const { getName } = useItemNames();

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

  const {
    data: historyResp,
    isLoading: historyLoading,
    isError: historyError,
    error: historyErr,
  } = useQuery({
    queryKey: ["bazaar-history", itemId],
    queryFn: () => getBazaarHistory(itemId!),
    enabled: !!itemId,
  });

  const historyRaw = historyResp?.data;
  const history: BazaarHistoryPoint[] | undefined = Array.isArray(historyRaw) ? historyRaw : undefined;

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    const cutoff = Date.now() - TIME_RANGE_MS[timeRange];
    return history.filter((point) => point.timestamp >= cutoff);
  }, [history, timeRange]);

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
          <StatusBadge meta={meta} isRefetching={isFetching} />
        </div>
      </div>

      {/* Price overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
        {/* Buy side */}
        <DataCard className={item.buyPrice > 0 ? "border-green-500/10" : ""}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-green-400" />
            </div>
            <span className="text-sm font-medium text-body">Buy Price</span>
            <span className="text-muted text-xs ml-auto">Highest buy order</span>
          </div>
          {item.buyPrice > 0 ? (
            <PriceDisplay amount={item.buyPrice} size="lg" />
          ) : (
            <span className="text-muted/50 text-lg">Nobody is buying this item</span>
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
            <span className="text-muted text-xs ml-auto">Cheapest sell order</span>
          </div>
          {item.sellPrice > 0 ? (
            <PriceDisplay amount={item.sellPrice} size="lg" />
          ) : (
            <span className="text-muted/50 text-lg">Nobody is selling this item</span>
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
      </div>

      {/* Spread banner */}
      {item.buyPrice > 0 && item.sellPrice > 0 && (
        <DataCard className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              item.spreadPercent >= 0 ? "bg-green-500/10" : "bg-damage/10"
            }`}>
              {item.spreadPercent >= 0
                ? <ArrowUpRight size={16} className="text-green-400" />
                : <ArrowDownRight size={16} className="text-damage" />
              }
            </div>
            <div>
              <p className="text-muted text-xs font-medium">Spread</p>
              <PriceDisplay amount={Math.abs(item.spread)} size="md" />
            </div>
          </div>
          <span className={`text-2xl font-mono font-bold ${
            item.spreadPercent >= 0 ? "text-green-400" : "text-damage"
          }`}>
            {item.spreadPercent >= 0 ? "+" : ""}{item.spreadPercent.toFixed(2)}%
          </span>
        </DataCard>
      )}

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
        <div className="flex gap-2 mb-5">
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
        </div>

        {historyLoading && <LoadingSkeleton lines={3} />}
        {historyError && <ErrorState error={historyErr instanceof Error ? historyErr : new Error("Failed to fetch history")} />}
        {!historyLoading && !historyError && filteredHistory.length > 0 && (
          <PriceHistoryChart data={filteredHistory} />
        )}
        {!historyLoading && !historyError && filteredHistory.length === 0 && (
          <div className="text-center py-10 text-muted">
            No history data available for this time range.
          </div>
        )}
      </DataCard>

      {/* Raw JSON */}
      <JsonViewer data={rawItem} title="Raw API Response" />
    </div>
  );
}
