import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { getBazaar } from "@/api/endpoints";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { LiveDot } from "@/components/ui/LiveDot";
import { DataCard } from "@/components/ui/DataCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatusBadge } from "@/components/layout/StatusBadge";

type SortOption =
  | "sell-high"
  | "sell-low"
  | "buy-high"
  | "buy-low"
  | "spread-high"
  | "name-az";

interface BazaarProductRaw {
  product_id: string;
  sell_summary: { amount: number; pricePerUnit: number; orders: number }[];
  buy_summary: { amount: number; pricePerUnit: number; orders: number }[];
  quick_status?: unknown;
}

interface ParsedProduct {
  product_id: string;
  name: string;
  sellPrice: number;
  buyPrice: number;
  sellVolume: number;
  buyVolume: number;
  sellOrders: number;
  buyOrders: number;
  spread: number;
  spreadPercent: number;
}

function formatProductName(productId: string): string {
  return productId
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function parseProduct(raw: BazaarProductRaw): ParsedProduct {
  // API names are inverted: buy_summary = orders users sell to, sell_summary = orders users buy from
  // Buy price = highest buy order (buy_summary[0], sorted highest first)
  const buyPrice = raw.buy_summary?.[0]?.pricePerUnit ?? 0;
  // Sell price = cheapest sell order (sell_summary[0], sorted lowest first)
  const sellPrice = raw.sell_summary?.[0]?.pricePerUnit ?? 0;

  const spread = buyPrice - sellPrice;
  const spreadPercent = sellPrice > 0 ? (spread / sellPrice) * 100 : 0;

  // Volume: swap API fields to match user perspective
  const buyOrders = raw.sell_summary?.reduce((sum, o) => sum + o.orders, 0) ?? 0;
  const buyVolume = raw.sell_summary?.reduce((sum, o) => sum + o.amount, 0) ?? 0;
  const sellOrders = raw.buy_summary?.reduce((sum, o) => sum + o.orders, 0) ?? 0;
  const sellVolume = raw.buy_summary?.reduce((sum, o) => sum + o.amount, 0) ?? 0;

  return {
    product_id: raw.product_id,
    name: formatProductName(raw.product_id),
    sellPrice,
    buyPrice,
    sellVolume,
    buyVolume,
    sellOrders,
    buyOrders,
    spread,
    spreadPercent,
  };
}

export default function BazaarPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("sell-high");

  const { data: resp, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["bazaar"],
    queryFn: () => getBazaar(),
  });

  const rawData = resp?.data as unknown as { products?: Record<string, BazaarProductRaw>; count?: number } | undefined;
  const meta = resp?.meta;

  const products = useMemo(() => {
    if (!rawData) return [];

    const productMap = rawData.products ?? rawData as unknown as Record<string, BazaarProductRaw>;

    let items: ParsedProduct[] = Object.values(productMap)
      .filter((p): p is BazaarProductRaw => p != null && typeof p === 'object' && 'product_id' in p)
      .map(parseProduct);

    if (search.trim()) {
      const term = search.toLowerCase();
      items = items.filter((p) =>
        p.product_id.toLowerCase().includes(term) || p.name.toLowerCase().includes(term)
      );
    }

    items.sort((a, b) => {
      switch (sort) {
        case "sell-high": return b.sellPrice - a.sellPrice;
        case "sell-low": return a.sellPrice - b.sellPrice;
        case "buy-high": return b.buyPrice - a.buyPrice;
        case "buy-low": return a.buyPrice - b.buyPrice;
        case "spread-high": return b.spreadPercent - a.spreadPercent;
        case "name-az": return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

    return items;
  }, [rawData, search, sort]);

  return (
    <div className="animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl text-gradient-coin font-bold">Bazaar</h1>
            <LiveDot />
            {rawData?.count != null && (
              <span className="text-muted text-sm font-mono bg-dungeon/30 px-2.5 py-1 rounded-lg">{rawData.count} items</span>
            )}
          </div>
          <StatusBadge meta={meta} isRefetching={isFetching} />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-nightstone border border-dungeon/50 text-body px-4 py-3 rounded-xl placeholder:text-muted/50 focus:outline-none focus:border-coin/50"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="bg-nightstone border border-dungeon/50 text-body px-4 py-3 rounded-xl focus:outline-none focus:border-coin/50"
          >
            <option value="sell-high">Sell Price: High to Low</option>
            <option value="sell-low">Sell Price: Low to High</option>
            <option value="buy-high">Buy Price: High to Low</option>
            <option value="buy-low">Buy Price: Low to High</option>
            <option value="spread-high">Spread %: High to Low</option>
            <option value="name-az">Name: A to Z</option>
          </select>
        </div>

        {isError && <ErrorState error={error instanceof Error ? error : new Error("Failed to fetch bazaar data")} />}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && !isError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <Link
                key={product.product_id}
                to={`/bazaar/${product.product_id}`}
                className="block group"
              >
                <DataCard className="h-full group-hover:border-coin/30 group-hover:shadow-lg group-hover:shadow-coin/5 transition-all duration-300 group-hover:-translate-y-0.5">
                  <div className="flex items-center gap-3 mb-4">
                    <ItemIcon itemId={product.product_id} size={36} />
                    <h3 className="text-body-light font-medium truncate text-sm flex-1">
                      {product.name}
                    </h3>
                    <LiveDot />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted text-xs font-medium flex items-center gap-1.5">
                        <TrendingUp size={12} className="text-green-400" />
                        Buy
                      </span>
                      {product.buyPrice > 0
                        ? <PriceDisplay amount={product.buyPrice} size="sm" />
                        : <span className="text-muted/40 text-sm">No orders</span>
                      }
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted text-xs font-medium flex items-center gap-1.5">
                        <TrendingDown size={12} className="text-enchant" />
                        Sell
                      </span>
                      {product.sellPrice > 0
                        ? <PriceDisplay amount={product.sellPrice} size="sm" />
                        : <span className="text-muted/40 text-sm">No orders</span>
                      }
                    </div>
                    {(product.buyPrice > 0 && product.sellPrice > 0) && (
                      <div className="flex justify-between items-center pt-2 border-t border-dungeon/30">
                        <span className="text-muted text-xs font-medium flex items-center gap-1.5">
                          {product.spreadPercent >= 0
                            ? <ArrowUpRight size={12} className="text-green-400" />
                            : <ArrowDownRight size={12} className="text-damage" />
                          }
                          Spread
                        </span>
                        <span
                          className={`text-sm font-mono font-medium ${
                            product.spreadPercent >= 0 ? "text-green-400" : "text-damage"
                          }`}
                        >
                          {product.spreadPercent >= 0 ? "+" : ""}{product.spreadPercent.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </DataCard>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && !isError && products.length === 0 && (
          <div className="text-center py-16 text-muted">
            No items found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
