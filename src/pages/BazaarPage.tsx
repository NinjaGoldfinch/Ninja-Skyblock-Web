import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight } from "lucide-react";
import { getBazaar } from "@/api/endpoints";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { calcSpread } from "@/lib/format";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { LiveDot } from "@/components/ui/LiveDot";
import { DataCard } from "@/components/ui/DataCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { useItemNames } from "@/hooks/useItemNames";
import { useSseLiveStatus } from "@/hooks/useSseLiveStatus";
import { useNextUpdate } from "@/hooks/useNextUpdate";
import type { BazaarProductRaw } from "@/types/api";

type SortOption =
  | "sell-high"
  | "sell-low"
  | "buy-high"
  | "buy-low"
  | "spread-high"
  | "name-az";

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

function parseProduct(raw: BazaarProductRaw, getName: (id: string) => string): ParsedProduct {
  // V1 API uses Hypixel's internal naming (inverted from user perspective):
  //   sell_summary = sell orders on the book = what user pays to instant-buy (cheapest first)
  //   buy_summary  = buy orders on the book = what user receives to instant-sell (highest first)
  const buyPrice = raw.sell_summary?.[0]?.pricePerUnit ?? 0;   // cheapest instant-buy price
  const sellPrice = raw.buy_summary?.[0]?.pricePerUnit ?? 0;   // highest instant-sell price

  const { spread, spreadPercent } = calcSpread(buyPrice, sellPrice);

  // Volume: map to user perspective
  const buyOrders = raw.sell_summary?.reduce((sum, o) => sum + o.orders, 0) ?? 0;
  const buyVolume = raw.sell_summary?.reduce((sum, o) => sum + o.amount, 0) ?? 0;
  const sellOrders = raw.buy_summary?.reduce((sum, o) => sum + o.orders, 0) ?? 0;
  const sellVolume = raw.buy_summary?.reduce((sum, o) => sum + o.amount, 0) ?? 0;

  return {
    product_id: raw.product_id,
    name: getName(raw.product_id),
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

const ITEMS_PER_PAGE = 40;

export default function BazaarPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("sell-high");
  const [page, setPage] = useState(1);
  const { getName } = useItemNames();

  const bazaarQueryKey = ["bazaar"] as const;
  const { data: resp, isLoading, isError, error, isFetching } = useQuery({
    queryKey: bazaarQueryKey,
    queryFn: () => getBazaar(),
  });

  const { sseActive, sseAgo } = useSseLiveStatus("__bazaar_listing__");
  const nextUpdateIn = useNextUpdate(bazaarQueryKey);

  const rawData = resp?.data as unknown as { products?: Record<string, BazaarProductRaw>; count?: number } | undefined;
  const meta = resp?.meta;

  const products = useMemo(() => {
    if (!rawData) return [];

    const productMap = rawData.products ?? rawData as unknown as Record<string, BazaarProductRaw>;

    let items: ParsedProduct[] = Object.values(productMap)
      .filter((p): p is BazaarProductRaw => p != null && typeof p === 'object' && 'product_id' in p)
      .map((p) => parseProduct(p, getName));

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
  }, [rawData, search, sort, getName]);

  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = products.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  const handleSearch = (value: string) => { setSearch(value); setPage(1); };
  const handleSort = (value: SortOption) => { setSort(value); setPage(1); };

  return (
    <div className="animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl text-gradient-coin font-bold">Bazaar</h1>
            <LiveDot active={sseActive} />
            {rawData?.count != null && (
              <span className="text-muted text-sm font-mono bg-dungeon/30 px-2.5 py-1 rounded-lg">{rawData.count} items</span>
            )}
          </div>
          <StatusBadge meta={meta} isRefetching={isFetching} sseActive={sseActive} sseAgo={sseAgo} nextUpdateIn={nextUpdateIn} />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 bg-nightstone border border-dungeon/50 text-body px-4 py-3 rounded-xl placeholder:text-muted/50 focus:outline-none focus:border-coin/50"
          />
          <select
            value={sort}
            onChange={(e) => handleSort(e.target.value as SortOption)}
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedProducts.map((product) => (
                <Link
                  key={product.product_id}
                  to={`/bazaar/${product.product_id}`}
                  className="block group"
                >
                  <DataCard className="h-full group-hover:border-coin/30 group-hover:shadow-lg group-hover:shadow-coin/5 transition-all duration-300 group-hover:-translate-y-0.5">
                    <div className="flex items-start gap-3 mb-4">
                      <ItemIcon itemId={product.product_id} size={36} />
                      <h3 className="text-body-light font-medium text-sm flex-1 min-w-0 line-clamp-2 leading-snug pt-0.5">
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="p-2 rounded-lg border border-dungeon/40 text-muted hover:text-body hover:border-dungeon/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                  .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("ellipsis");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === "ellipsis" ? (
                      <span key={`e${i}`} className="px-1 text-muted/50">...</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item)}
                        className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all ${
                          item === safePage
                            ? "bg-coin/10 text-coin border border-coin/30"
                            : "border border-dungeon/40 text-muted hover:text-body hover:border-dungeon/60"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="p-2 rounded-lg border border-dungeon/40 text-muted hover:text-body hover:border-dungeon/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>

                <span className="text-muted text-xs ml-3">
                  {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, products.length)} of {products.length}
                </span>
              </div>
            )}

            {products.length === 0 && (
              <div className="text-center py-16 text-muted">
                No items found matching your search.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
