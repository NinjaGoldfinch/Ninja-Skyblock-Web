import { useMemo, useCallback, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Star, LayoutGrid, List,
} from "lucide-react";
import { getBazaarV2, getBazaarCategories } from "@/api/endpoints";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { DataCard } from "@/components/ui/DataCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useFavorites } from "@/hooks/useFavorites";
import { usePriceDirection } from "@/hooks/usePriceDirection";
import type { BazaarProductV2 } from "@/types/api";

// --- Types & constants ---

type SortField = "instant_sell_price" | "instant_buy_price" | "margin_percent" | "tax_adjusted_margin" | "buy_volume" | "sell_volume" | "display_name";
type SortOrder = "asc" | "desc";

interface SortOption {
  label: string;
  field: SortField;
  order: SortOrder;
}

const SORT_OPTIONS: SortOption[] = [
  { label: "Sell Price: High to Low", field: "instant_sell_price", order: "desc" },
  { label: "Sell Price: Low to High", field: "instant_sell_price", order: "asc" },
  { label: "Buy Price: High to Low", field: "instant_buy_price", order: "desc" },
  { label: "Buy Price: Low to High", field: "instant_buy_price", order: "asc" },
  { label: "Margin %: High to Low", field: "margin_percent", order: "desc" },
  { label: "Tax-Adj Margin: High to Low", field: "tax_adjusted_margin", order: "desc" },
  { label: "Buy Volume: High to Low", field: "buy_volume", order: "desc" },
  { label: "Sell Volume: High to Low", field: "sell_volume", order: "desc" },
  { label: "Name: A to Z", field: "display_name", order: "asc" },
];

const PER_PAGE_OPTIONS = [20, 40, 80, 160, 200] as const;
const DEFAULT_PER_PAGE = 40;
const API_MAX_LIMIT = 200;

/** Format a category slug like "ultimate_enchantment" → "Ultimate Enchantment" */
function formatCategoryLabel(slug: unknown): string {
  if (typeof slug !== 'string') return String(slug);
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Extract category name from either a string or an object like { name: "enchantment", ... } */
function getCategoryValue(cat: unknown): string {
  if (typeof cat === 'string') return cat;
  if (cat != null && typeof cat === 'object' && 'name' in cat) return String((cat as { name: unknown }).name);
  if (cat != null && typeof cat === 'object' && 'id' in cat) return String((cat as { id: unknown }).id);
  return String(cat);
}

// --- Helpers ---

function formatVolume(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function sortKey(field: SortField, order: SortOrder): string {
  return `${field}-${order}`;
}

function parseSortKey(key: string | null): { field: SortField; order: SortOrder } {
  if (!key) return { field: "instant_sell_price", order: "desc" };
  const opt = SORT_OPTIONS.find((o) => sortKey(o.field, o.order) === key);
  return opt ? { field: opt.field, order: opt.order } : { field: "instant_sell_price", order: "desc" };
}

// --- Component ---

export default function BazaarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { favorites, toggle: toggleFavorite, isFavorite, clearAll: clearFavorites } = useFavorites();
  const getDirection = usePriceDirection();

  const { data: categoriesResp } = useQuery({
    queryKey: ["bazaar-categories"],
    queryFn: () => getBazaarCategories(),
    staleTime: 10 * 60_000,
  });
  const rawCats = categoriesResp?.data;
  const categories: string[] = Array.isArray(rawCats)
    ? rawCats
    : (rawCats != null && typeof rawCats === 'object' && 'categories' in rawCats && Array.isArray((rawCats as { categories: unknown }).categories))
      ? (rawCats as { categories: string[] }).categories
      : [];

  // URL state
  const rawSearch = searchParams.get("q") ?? "";
  const sortParam = parseSortKey(searchParams.get("sort"));
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPage = (() => {
    const v = parseInt(searchParams.get("per_page") ?? "", 10);
    return (PER_PAGE_OPTIONS as readonly number[]).includes(v) ? v : DEFAULT_PER_PAGE;
  })();
  const activeCategory = searchParams.get("cat") ?? "";
  const viewMode = (searchParams.get("view") === "list" ? "list" : "grid") as "grid" | "list";

  // Debounced search
  const [searchInput, setSearchInput] = useState(rawSearch);
  useEffect(() => {
    const timer = setTimeout(() => {
      setParam({ q: searchInput || null, page: null });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const setParam = useCallback((updates: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value == null) next.delete(key);
        else next.set(key, value);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleSort = useCallback((key: string) => {
    const defaultKey = sortKey("instant_sell_price", "desc");
    setParam({ sort: key === defaultKey ? null : key, page: null });
  }, [setParam]);
  const setPage = useCallback((p: number) => setParam({ page: p <= 1 ? null : String(p) }), [setParam]);
  const handlePerPage = useCallback((v: string) => {
    setParam({ per_page: v === String(DEFAULT_PER_PAGE) ? null : v, page: null });
  }, [setParam]);
  const handleCategory = useCallback((cat: string) => {
    setParam({ cat: cat || null, page: null });
  }, [setParam]);
  const handleView = useCallback((v: "grid" | "list") => {
    setParam({ view: v === "grid" ? null : v });
  }, [setParam]);

  // API query
  const limit = Math.min(perPage, API_MAX_LIMIT);
  const offset = (page - 1) * limit;

  const { data: resp, isLoading, isError, error } = useQuery({
    queryKey: ["bazaar-v2", rawSearch, sortParam.field, sortParam.order, activeCategory, limit, offset],
    queryFn: () => getBazaarV2({
      search: rawSearch || undefined,
      sort: sortParam.field,
      order: sortParam.order,
      category: activeCategory || undefined,
      limit,
      offset,
    }),
  });

  const respData = resp?.data as { items?: BazaarProductV2[]; products?: BazaarProductV2[]; total?: number } | BazaarProductV2[] | undefined;
  const products: BazaarProductV2[] = Array.isArray(respData)
    ? respData
    : (respData?.items ?? respData?.products ?? []);
  const totalItems = Array.isArray(respData)
    ? respData.length
    : (respData?.total ?? products.length);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(page, totalPages);

  // Fetch favorites in a single batched request
  const favIds = favorites.join(",");
  const { data: favsResp } = useQuery({
    queryKey: ["bazaar", "favorites", favIds],
    queryFn: () => getBazaarV2({ item_ids: favIds }),
    enabled: favorites.length > 0,
    staleTime: 30_000,
  });
  const favoriteProducts = useMemo(() => {
    if (favorites.length === 0) return [];
    const rawFavs = favsResp?.data as { items?: BazaarProductV2[]; products?: BazaarProductV2[] } | BazaarProductV2[] | undefined;
    const all: BazaarProductV2[] = Array.isArray(rawFavs)
      ? rawFavs
      : (rawFavs?.items ?? rawFavs?.products ?? []);
    const favSet = new Set(favorites);
    return all.filter((p) => favSet.has(p.item_id));
  }, [favsResp, favorites]);

  return (
    <div className="animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl text-gradient-coin font-bold">Bazaar</h1>
            {totalItems > 0 && (
              <span className="text-muted text-sm font-mono bg-dungeon/30 px-2.5 py-1 rounded-lg">
                {totalItems} items
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 border border-dungeon/40 rounded-lg p-0.5">
            <button
              onClick={() => handleView("grid")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-coin/10 text-coin" : "text-muted hover:text-body"}`}
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => handleView("list")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-coin/10 text-coin" : "text-muted hover:text-body"}`}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search items..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 bg-nightstone border border-dungeon/50 text-body px-4 py-3 rounded-xl placeholder:text-muted/50 focus:outline-none focus:border-coin/50"
          />
          <select
            value={sortKey(sortParam.field, sortParam.order)}
            onChange={(e) => handleSort(e.target.value)}
            className="bg-nightstone border border-dungeon/50 text-body px-4 py-3 rounded-xl focus:outline-none focus:border-coin/50"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={sortKey(o.field, o.order)} value={sortKey(o.field, o.order)}>{o.label}</option>
            ))}
          </select>
          <select
            value={String(perPage)}
            onChange={(e) => handlePerPage(e.target.value)}
            className="bg-nightstone border border-dungeon/50 text-body px-4 py-3 rounded-xl focus:outline-none focus:border-coin/50 w-auto"
          >
            {PER_PAGE_OPTIONS.map((o) => (
              <option key={o} value={String(o)}>{o} / page</option>
            ))}
          </select>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCategory("")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !activeCategory
                ? "bg-coin/10 text-coin border border-coin/30"
                : "border border-dungeon/40 text-muted hover:text-body hover:border-dungeon/60"
            }`}
          >
            All
          </button>
          {categories.map((cat) => {
            const value = getCategoryValue(cat);
            return (
              <button
                key={value}
                onClick={() => handleCategory(activeCategory === value ? "" : value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeCategory === value
                    ? "bg-coin/10 text-coin border border-coin/30"
                    : "border border-dungeon/40 text-muted hover:text-body hover:border-dungeon/60"
                }`}
              >
                {formatCategoryLabel(value)}
              </button>
            );
          })}
        </div>

        {isError && <ErrorState error={error instanceof Error ? error : new Error("Failed to fetch bazaar data")} />}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {/* Watchlist */}
            {favoriteProducts.length > 0 && !rawSearch && !activeCategory && (
              <WatchlistSection
                products={favoriteProducts}
                toggleFavorite={toggleFavorite}
                clearAll={clearFavorites}
                getDirection={getDirection}
              />
            )}

            {/* Main content */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((p) => (
                  <ProductCard
                    key={p.item_id}
                    product={p}
                    isFavorite={isFavorite(p.item_id)}
                    onToggleFavorite={() => toggleFavorite(p.item_id)}
                    direction={getDirection(p.item_id)}
                  />
                ))}
              </div>
            ) : (
              <ProductTable
                products={products}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
                getDirection={getDirection}
              />
            )}

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
                  {offset + 1}–{Math.min(offset + limit, totalItems)} of {totalItems}
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

// --- Sub-components ---

const WATCHLIST_COLLAPSED_COUNT = 4;

function WatchlistSection({
  products,
  toggleFavorite,
  clearAll,
  getDirection,
}: {
  products: BazaarProductV2[];
  toggleFavorite: (id: string) => void;
  clearAll: () => void;
  getDirection: (id: string) => "up" | "down" | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = products.length > WATCHLIST_COLLAPSED_COUNT;
  const visible = expanded || !canCollapse ? products : products.slice(0, WATCHLIST_COLLAPSED_COUNT);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-display text-gradient-coin uppercase tracking-widest font-semibold flex items-center gap-2">
          <Star size={14} className="text-yellow-400 fill-yellow-400" />
          Watchlist
          <span className="text-muted/60 text-xs font-mono font-normal normal-case tracking-normal">
            {products.length}
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={clearAll}
            className="text-xs text-muted hover:text-damage transition-colors"
          >
            Clear all
          </button>
          {canCollapse && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-muted hover:text-body flex items-center gap-1 transition-colors"
            >
              {expanded ? (
                <>Show less <ChevronUp size={14} /></>
              ) : (
                <>Show all ({products.length}) <ChevronDown size={14} /></>
              )}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {visible.map((p) => (
          <ProductCard
            key={`fav-${p.item_id}`}
            product={p}
            isFavorite
            onToggleFavorite={() => toggleFavorite(p.item_id)}
            direction={getDirection(p.item_id)}
          />
        ))}
      </div>
    </div>
  );
}

function ProductCard({
  product: p,
  isFavorite,
  onToggleFavorite,
  direction,
}: {
  product: BazaarProductV2;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  direction: "up" | "down" | null;
}) {
  const directionBorder = direction === "up"
    ? "border-green-500/20"
    : direction === "down"
      ? "border-red-500/20"
      : "";

  return (
    <div className="relative group">
      <Link to={`/bazaar/${p.item_id}`} className="block">
        <DataCard className={`h-full group-hover:border-coin/30 group-hover:shadow-lg group-hover:shadow-coin/5 transition-all duration-300 group-hover:-translate-y-0.5 ${directionBorder}`}>
          <div className="flex items-start gap-3 mb-4">
            <ItemIcon itemId={p.item_id} size={36} />
            <h3 className="text-body-light font-medium text-sm flex-1 min-w-0 line-clamp-2 leading-snug pt-0.5">
              {p.display_name}
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted text-xs font-medium flex items-center gap-1.5">
                <TrendingUp size={12} className="text-green-400" />
                Buy
              </span>
              {p.instant_buy_price > 0
                ? <PriceDisplay amount={p.instant_buy_price} size="sm" />
                : <span className="text-muted/40 text-sm">No orders</span>}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted text-xs font-medium flex items-center gap-1.5">
                <TrendingDown size={12} className="text-enchant" />
                Sell
              </span>
              {p.instant_sell_price > 0
                ? <PriceDisplay amount={p.instant_sell_price} size="sm" />
                : <span className="text-muted/40 text-sm">No orders</span>}
            </div>
            {p.instant_buy_price > 0 && p.instant_sell_price > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-dungeon/30">
                <span className="text-muted text-xs font-medium flex items-center gap-1.5">
                  {p.margin_percent >= 0
                    ? <ArrowUpRight size={12} className="text-green-400" />
                    : <ArrowDownRight size={12} className="text-damage" />}
                  Margin
                </span>
                <span className={`text-sm font-mono font-medium ${p.margin_percent >= 0 ? "text-green-400" : "text-damage"}`}>
                  {p.margin_percent >= 0 ? "+" : ""}{p.margin_percent.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </DataCard>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); onToggleFavorite(); }}
        className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all z-10 ${
          isFavorite
            ? "text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20"
            : "text-muted/30 hover:text-muted/60 opacity-0 group-hover:opacity-100"
        }`}
        aria-label={isFavorite ? "Remove from watchlist" : "Add to watchlist"}
      >
        <Star size={14} className={isFavorite ? "fill-yellow-400" : ""} />
      </button>
    </div>
  );
}

function ProductTable({
  products,
  isFavorite,
  onToggleFavorite,
  getDirection,
}: {
  products: BazaarProductV2[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  getDirection: (id: string) => "up" | "down" | null;
}) {
  return (
    <div className="glass rounded-2xl border border-dungeon/40 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-dungeon/40 text-muted text-xs uppercase tracking-wider">
            <th className="text-left py-3 px-4 w-8"></th>
            <th className="text-left py-3 px-4">Item</th>
            <th className="text-right py-3 px-4">Buy</th>
            <th className="text-right py-3 px-4">Sell</th>
            <th className="text-right py-3 px-4">Margin</th>
            <th className="text-right py-3 px-4 hidden md:table-cell">Buy Vol</th>
            <th className="text-right py-3 px-4 hidden md:table-cell">Sell Vol</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const fav = isFavorite(p.item_id);
            const dir = getDirection(p.item_id);
            const rowTint = dir === "up" ? "bg-green-500/3" : dir === "down" ? "bg-red-500/3" : "";
            return (
              <tr key={p.item_id} className={`border-b border-dungeon/20 hover:bg-coin/3 transition-colors group ${rowTint}`}>
                <td className="py-2.5 px-4">
                  <button
                    onClick={() => onToggleFavorite(p.item_id)}
                    className={`p-1 rounded transition-all ${
                      fav ? "text-yellow-400" : "text-muted/20 hover:text-muted/50 opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <Star size={12} className={fav ? "fill-yellow-400" : ""} />
                  </button>
                </td>
                <td className="py-2.5 px-4">
                  <Link to={`/bazaar/${p.item_id}`} className="flex items-center gap-2.5 hover:text-coin transition-colors">
                    <ItemIcon itemId={p.item_id} size={24} />
                    <span className="text-body-light font-medium truncate max-w-[200px]">{p.display_name}</span>
                  </Link>
                </td>
                <td className="py-2.5 px-4 text-right">
                  {p.instant_buy_price > 0 ? <PriceDisplay amount={p.instant_buy_price} size="sm" /> : <span className="text-muted/40">—</span>}
                </td>
                <td className="py-2.5 px-4 text-right">
                  {p.instant_sell_price > 0 ? <PriceDisplay amount={p.instant_sell_price} size="sm" /> : <span className="text-muted/40">—</span>}
                </td>
                <td className="py-2.5 px-4 text-right">
                  {p.instant_buy_price > 0 && p.instant_sell_price > 0 ? (
                    <span className={`font-mono font-medium ${p.margin_percent >= 0 ? "text-green-400" : "text-damage"}`}>
                      {p.margin_percent >= 0 ? "+" : ""}{p.margin_percent.toFixed(2)}%
                    </span>
                  ) : <span className="text-muted/40">—</span>}
                </td>
                <td className="py-2.5 px-4 text-right hidden md:table-cell font-mono text-muted">
                  {formatVolume(p.buy_volume)}
                </td>
                <td className="py-2.5 px-4 text-right hidden md:table-cell font-mono text-muted">
                  {formatVolume(p.sell_volume)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
