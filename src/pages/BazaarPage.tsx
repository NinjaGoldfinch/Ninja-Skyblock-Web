import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight } from "lucide-react";
import { getBazaar } from "@/api/endpoints";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { calcSpread } from "@/lib/format";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { DataCard } from "@/components/ui/DataCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useItemNames } from "@/hooks/useItemNames";
import type { BazaarProductRaw } from "@/types/api";

type SortOption =
  | "sell-high"
  | "sell-low"
  | "buy-high"
  | "buy-low"
  | "spread-high"
  | "name-az";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "sell-high", label: "Sell Price: High to Low" },
  { value: "sell-low", label: "Sell Price: Low to High" },
  { value: "buy-high", label: "Buy Price: High to Low" },
  { value: "buy-low", label: "Buy Price: Low to High" },
  { value: "spread-high", label: "Spread %: High to Low" },
  { value: "name-az", label: "Name: A to Z" },
];

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
  const buyPrice = raw.sell_summary?.[0]?.pricePerUnit ?? 0;
  const sellPrice = raw.buy_summary?.[0]?.pricePerUnit ?? 0;

  const { spread, spreadPercent } = calcSpread(buyPrice, sellPrice);

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

function isValidSort(value: string | null): value is SortOption {
  return value != null && SORT_OPTIONS.some((o) => o.value === value);
}

const PER_PAGE_OPTIONS = [20, 40, 80, 160, "all"] as const;
type PerPage = number | "all";
const DEFAULT_PER_PAGE = 40;

function parsePerPage(value: string | null): PerPage {
  if (value === "all") return "all";
  const n = parseInt(value ?? "", 10);
  return (PER_PAGE_OPTIONS as readonly (number | string)[]).includes(n) ? n : DEFAULT_PER_PAGE;
}

export default function BazaarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getName } = useItemNames();

  // Read state from URL
  const search = searchParams.get("q") ?? "";
  const sort: SortOption = isValidSort(searchParams.get("sort")) ? searchParams.get("sort") as SortOption : "sell-high";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPage = parsePerPage(searchParams.get("per_page"));

  // Update URL params (replaces history entry to avoid back-button spam)
  const setParam = useCallback((updates: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value == null) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleSearch = useCallback((value: string) => {
    setParam({ q: value || null, page: null });
  }, [setParam]);

  const handleSort = useCallback((value: SortOption) => {
    setParam({ sort: value === "sell-high" ? null : value, page: null });
  }, [setParam]);

  const setPage = useCallback((p: number) => {
    setParam({ page: p <= 1 ? null : String(p) });
  }, [setParam]);

  const handlePerPage = useCallback((value: string) => {
    const pp = value === "all" ? "all" : value;
    setParam({ per_page: pp === String(DEFAULT_PER_PAGE) ? null : pp, page: null });
  }, [setParam]);

  const { data: resp, isLoading, isError, error } = useQuery({
    queryKey: ["bazaar"],
    queryFn: () => getBazaar(),
  });

  const rawData = resp?.data as unknown as { products?: Record<string, BazaarProductRaw>; count?: number } | undefined;

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

  const showAll = perPage === "all";
  const itemsPerPage = showAll ? products.length : perPage;
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(products.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = showAll
    ? products
    : products.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  return (
    <div className="animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl text-gradient-coin font-bold">Bazaar</h1>
            {products.length > 0 && (
              <span className="text-muted text-sm font-mono bg-dungeon/30 px-2.5 py-1 rounded-lg">{products.length} items</span>
            )}
          </div>
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
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={String(perPage)}
            onChange={(e) => handlePerPage(e.target.value)}
            className="bg-nightstone border border-dungeon/50 text-body px-4 py-3 rounded-xl focus:outline-none focus:border-coin/50 w-auto"
          >
            {PER_PAGE_OPTIONS.map((o) => (
              <option key={o} value={String(o)}>
                {o === "all" ? "Show All" : `${o} / page`}
              </option>
            ))}
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
                  onClick={() => setPage(Math.max(1, safePage - 1))}
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
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage >= totalPages}
                  className="p-2 rounded-lg border border-dungeon/40 text-muted hover:text-body hover:border-dungeon/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>

                <span className="text-muted text-xs ml-3">
                  {(safePage - 1) * itemsPerPage + 1}–{Math.min(safePage * itemsPerPage, products.length)} of {products.length}
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
