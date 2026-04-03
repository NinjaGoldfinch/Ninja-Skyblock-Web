import { useCallback, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Star, LayoutGrid, List, Gavel, Search,
} from "lucide-react";
import {
  getLowestBinsPaginated,
  searchAuctions,
  getPlayerAuctions,
  getEndedAuctions,
} from "@/api/endpoints";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { RarityBadge } from "@/components/ui/ItemRarity";
import { DataCard } from "@/components/ui/DataCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { CopyButton } from "@/components/ui/CopyButton";
import { useFavorites } from "@/hooks/useFavorites";
import { formatNumber, formatDate, truncateUuid } from "@/lib/format";
import { useAuctionSseLiveStatus } from "@/hooks/useAuctionSseLiveStatus";
import { LiveDot } from "@/components/ui/LiveDot";

// ─── Types & constants ─────────────────────────────────────────

interface LowestBinItem {
  skyblock_id: string;
  base_item: string;
  item_name: string;
  lowest_price: number;
  auction_id: string;
  seller_uuid: string;
  tier: string;
  count: number;
}

/** Get the best available identifier — skyblock_id if present, otherwise base_item */
function itemKey(item: LowestBinItem): string {
  return item.skyblock_id || item.base_item || item.auction_id;
}

function itemLink(item: LowestBinItem): string | null {
  return item.skyblock_id ? `/auctions/item/${encodeURIComponent(item.skyblock_id)}` : null;
}

type Tab = "lowest-bins" | "search" | "player" | "ended";
type SortField = "lowest_price" | "count" | "item_name" | "tier";
type SortOrder = "asc" | "desc";

interface SortOption {
  label: string;
  field: SortField;
  order: SortOrder;
}

const SORT_OPTIONS: SortOption[] = [
  { label: "Price: Low to High", field: "lowest_price", order: "asc" },
  { label: "Price: High to Low", field: "lowest_price", order: "desc" },
  { label: "Listings: High to Low", field: "count", order: "desc" },
  { label: "Listings: Low to High", field: "count", order: "asc" },
  { label: "Name: A to Z", field: "item_name", order: "asc" },
  { label: "Tier: High to Low", field: "tier", order: "desc" },
];

const TIER_ORDER = [
  "COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY",
  "MYTHIC", "SPECIAL", "VERY_SPECIAL", "SUPREME", "ULTIMATE",
];

const PER_PAGE_OPTIONS = [20, 40, 80, 160, 200] as const;
const DEFAULT_PER_PAGE = 40;
const WATCHLIST_COLLAPSED = 4;

function formatTierLabel(tier: string): string {
  return tier.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function sortKey(field: SortField, order: SortOrder) { return `${field}-${order}`; }

function parseSortKey(key: string | null): { field: SortField; order: SortOrder } {
  if (!key) return { field: "lowest_price", order: "asc" };
  const opt = SORT_OPTIONS.find((o) => sortKey(o.field, o.order) === key);
  return opt ? { field: opt.field, order: opt.order } : { field: "lowest_price", order: "asc" };
}

// ─── Main page ─────────────────────────────────────────────────

export default function AuctionHousePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get("tab") as Tab) || "lowest-bins";

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

  const setTab = useCallback((tab: Tab) => {
    setSearchParams(tab === "lowest-bins" ? {} : { tab }, { replace: true });
  }, [setSearchParams]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "lowest-bins", label: "Lowest BINs" },
    { key: "search", label: "Search" },
    { key: "player", label: "Player Auctions" },
    { key: "ended", label: "Ended" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Gavel size={28} className="text-coin" />
          <h1 className="font-display text-4xl text-gradient-coin font-bold">Auction House</h1>
          <AuctionLiveIndicator />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-dungeon/30">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={`relative px-5 py-2.5 text-sm font-medium transition-all rounded-t-xl ${
                activeTab === tab.key
                  ? "text-coin"
                  : "text-muted hover:text-body hover:bg-dungeon/15"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-coin to-coin-light rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "lowest-bins" && <LowestBinsTab setParam={setParam} searchParams={searchParams} />}
        {activeTab === "search" && <AuctionSearchTab setParam={setParam} searchParams={searchParams} />}
        {activeTab === "player" && <PlayerAuctionsTab />}
        {activeTab === "ended" && <EndedTab />}
      </div>
    </div>
  );
}

// ─── Lowest BINs tab ───────────────────────────────────────────

function LowestBinsTab({
  setParam,
  searchParams,
}: {
  setParam: (u: Record<string, string | null>) => void;
  searchParams: URLSearchParams;
}) {
  const { favorites, toggle: toggleFavorite, isFavorite, clearAll: clearFavorites } = useFavorites();

  // URL state
  const rawSearch = searchParams.get("q") ?? "";
  const sortParam = parseSortKey(searchParams.get("sort"));
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPage = (() => {
    const v = parseInt(searchParams.get("per_page") ?? "", 10);
    return (PER_PAGE_OPTIONS as readonly number[]).includes(v) ? v : DEFAULT_PER_PAGE;
  })();
  const activeTier = searchParams.get("tier") ?? "";
  const viewMode = (searchParams.get("view") === "list" ? "list" : "grid") as "grid" | "list";

  // Debounced search
  const [searchInput, setSearchInput] = useState(rawSearch);
  useEffect(() => {
    const timer = setTimeout(() => {
      setParam({ q: searchInput || null, page: null });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSort = useCallback((key: string) => {
    const defaultKey = sortKey("lowest_price", "asc");
    setParam({ sort: key === defaultKey ? null : key, page: null });
  }, [setParam]);
  const setPage = useCallback((p: number) => setParam({ page: p <= 1 ? null : String(p) }), [setParam]);
  const handlePerPage = useCallback((v: string) => {
    setParam({ per_page: v === String(DEFAULT_PER_PAGE) ? null : v, page: null });
  }, [setParam]);
  const handleTier = useCallback((t: string) => {
    setParam({ tier: t || null, page: null });
  }, [setParam]);
  const handleView = useCallback((v: "grid" | "list") => {
    setParam({ view: v === "grid" ? null : v });
  }, [setParam]);

  // Server-side paginated query
  const limit = Math.min(perPage, 200);
  const offset = (page - 1) * limit;

  const { data: resp, isLoading, isError, error } = useQuery({
    queryKey: ["lowestBins", rawSearch, sortParam.field, sortParam.order, activeTier, limit, offset],
    queryFn: () => getLowestBinsPaginated({
      search: rawSearch || undefined,
      sort: sortParam.field,
      order: sortParam.order,
      tier: activeTier || undefined,
      limit,
      offset,
    }),
    staleTime: 30_000,
  });

  const rawData = resp?.data as unknown as { items?: LowestBinItem[]; total?: number } | LowestBinItem[] | undefined;
  const pageItems: LowestBinItem[] = Array.isArray(rawData) ? rawData : (rawData?.items ?? []);
  const totalItems = Array.isArray(rawData) ? rawData.length : (rawData?.total ?? pageItems.length);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(page, totalPages);

  // Favorites — fetch each by search to ensure we find them regardless of sort/page
  const favKey = favorites.join(",");
  const { data: favsResults } = useQuery({
    queryKey: ["lowestBins", "favorites", favKey],
    queryFn: async () => {
      const results: LowestBinItem[] = [];
      const favSet = new Set(favorites);
      // Fetch a large page and filter — most favorites will be found
      const resp = await getLowestBinsPaginated({ limit: 200 });
      const rawData = resp?.data as unknown as { items?: LowestBinItem[] } | LowestBinItem[] | undefined;
      const all: LowestBinItem[] = Array.isArray(rawData) ? rawData : (rawData?.items ?? []);
      for (const item of all) {
        if (favSet.has(itemKey(item))) {
          results.push(item);
          favSet.delete(itemKey(item));
        }
      }
      // For any remaining unfound favorites, search individually
      for (const id of favSet) {
        try {
          const resp2 = await getLowestBinsPaginated({ search: id, limit: 1 });
          const raw2 = resp2?.data as unknown as { items?: LowestBinItem[] } | LowestBinItem[] | undefined;
          const items2: LowestBinItem[] = Array.isArray(raw2) ? raw2 : (raw2?.items ?? []);
          if (items2.length > 0) results.push(items2[0]!);
        } catch { /* skip unfound */ }
      }
      return results;
    },
    enabled: favorites.length > 0,
    staleTime: 60_000,
  });
  const favoriteItems = favsResults ?? [];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted/50" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-nightstone border border-dungeon/40 text-body pl-11 pr-4 py-3 rounded-xl placeholder:text-muted/40 focus:outline-none focus:border-coin/40"
          />
        </div>
        <select
          value={sortKey(sortParam.field, sortParam.order)}
          onChange={(e) => handleSort(e.target.value)}
          className="bg-nightstone border border-dungeon/40 text-body px-4 py-3 rounded-xl focus:outline-none focus:border-coin/40"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={sortKey(o.field, o.order)} value={sortKey(o.field, o.order)}>{o.label}</option>
          ))}
        </select>
        <select
          value={String(perPage)}
          onChange={(e) => handlePerPage(e.target.value)}
          className="bg-nightstone border border-dungeon/40 text-body px-4 py-3 rounded-xl focus:outline-none focus:border-coin/40 w-auto"
        >
          {PER_PAGE_OPTIONS.map((o) => (
            <option key={o} value={String(o)}>{o} / page</option>
          ))}
        </select>
        <div className="flex items-center gap-1 border border-dungeon/40 rounded-xl p-0.5 self-start">
          <button
            onClick={() => handleView("grid")}
            className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-coin/10 text-coin" : "text-muted hover:text-body"}`}
            aria-label="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => handleView("list")}
            className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-coin/10 text-coin" : "text-muted hover:text-body"}`}
            aria-label="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Tier filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleTier("")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !activeTier
              ? "bg-coin/10 text-coin border border-coin/25"
              : "border border-dungeon/35 text-muted hover:text-body hover:border-dungeon/50"
          }`}
        >
          All
        </button>
        {TIER_ORDER.map((tier) => (
          <button
            key={tier}
            onClick={() => handleTier(activeTier === tier ? "" : tier)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTier === tier
                ? "bg-coin/10 text-coin border border-coin/25"
                : "border border-dungeon/35 text-muted hover:text-body hover:border-dungeon/50"
            }`}
          >
            {formatTierLabel(tier)}
          </button>
        ))}
        {totalItems > 0 && (
          <span className="ml-auto text-muted text-xs font-mono self-center bg-dungeon/20 px-2.5 py-1 rounded-lg">
            {totalItems.toLocaleString()} items
          </span>
        )}
      </div>

      {isError && <ErrorState error={error instanceof Error ? error : new Error("Failed to fetch auctions")} />}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Watchlist */}
          {favoriteItems.length > 0 && !rawSearch && !activeTier && (
            <WatchlistSection
              items={favoriteItems}
              toggleFavorite={toggleFavorite}
              clearAll={clearFavorites}
            />
          )}

          {/* Main content */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pageItems.map((item) => (
                <AuctionCard
                  key={itemKey(item)}
                  item={item}
                  isFavorite={isFavorite(itemKey(item))}
                  onToggleFavorite={() => toggleFavorite(itemKey(item))}
                />
              ))}
            </div>
          ) : (
            <AuctionTable
              items={pageItems}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              offset={offset}
              perPage={perPage}
              totalItems={totalItems}
              setPage={setPage}
            />
          )}

          {pageItems.length === 0 && (
            <div className="text-center py-16 text-muted">
              No items found matching your search.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function WatchlistSection({
  items,
  toggleFavorite,
  clearAll,
}: {
  items: LowestBinItem[];
  toggleFavorite: (id: string) => void;
  clearAll: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = items.length > WATCHLIST_COLLAPSED;
  const visible = expanded || !canCollapse ? items : items.slice(0, WATCHLIST_COLLAPSED);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-display text-gradient-coin uppercase tracking-widest font-semibold flex items-center gap-2">
          <Star size={14} className="text-yellow-400 fill-yellow-400" />
          Watchlist
          <span className="text-muted/50 text-xs font-mono font-normal normal-case tracking-normal">{items.length}</span>
        </h2>
        <div className="flex items-center gap-3">
          <button onClick={clearAll} className="text-xs text-muted hover:text-damage transition-colors">Clear all</button>
          {canCollapse && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-muted hover:text-body flex items-center gap-1 transition-colors"
            >
              {expanded ? <>Show less <ChevronUp size={14} /></> : <>Show all ({items.length}) <ChevronDown size={14} /></>}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {visible.map((item) => (
          <AuctionCard
            key={`fav-${itemKey(item)}`}
            item={item}
            isFavorite
            onToggleFavorite={() => toggleFavorite(itemKey(item))}
          />
        ))}
      </div>
    </div>
  );
}

function AuctionCard({
  item,
  isFavorite,
  onToggleFavorite,
}: {
  item: LowestBinItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const link = itemLink(item);
  const cardContent = (
    <DataCard className="h-full group-hover:border-coin/25 group-hover:shadow-lg group-hover:shadow-coin/5 transition-all duration-300 group-hover:-translate-y-0.5">
      <div className="flex items-start gap-3 mb-3">
        <ItemIcon itemId={item.skyblock_id} size={36} />
        <div className="flex-1 min-w-0">
          <h3 className="text-body-light font-medium text-sm line-clamp-2 leading-snug">{item.base_item || item.item_name}</h3>
          <RarityBadge tier={item.tier} className="mt-1.5" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-auto">
        <PriceDisplay amount={item.lowest_price} size="sm" />
        {item.count > 1 && (
          <span className="text-[11px] text-muted font-mono bg-dungeon/25 px-2 py-0.5 rounded-md">
            {item.count} listed
          </span>
        )}
      </div>
    </DataCard>
  );

  return (
    <div className="relative group">
      {link ? <Link to={link} className="block">{cardContent}</Link> : cardContent}
      <button
        onClick={(e) => { e.preventDefault(); onToggleFavorite(); }}
        className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all z-10 ${
          isFavorite
            ? "text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20"
            : "text-muted/20 hover:text-muted/50 opacity-0 group-hover:opacity-100"
        }`}
        aria-label={isFavorite ? "Remove from watchlist" : "Add to watchlist"}
      >
        <Star size={14} className={isFavorite ? "fill-yellow-400" : ""} />
      </button>
    </div>
  );
}

function AuctionTable({
  items,
  isFavorite,
  onToggleFavorite,
}: {
  items: LowestBinItem[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <div className="glass rounded-2xl border border-dungeon/30 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-dungeon/30 text-muted text-xs uppercase tracking-wider">
            <th className="text-left py-3 px-4 w-8"></th>
            <th className="text-left py-3 px-4">Item</th>
            <th className="text-left py-3 px-4 hidden sm:table-cell">Tier</th>
            <th className="text-right py-3 px-4">Price</th>
            <th className="text-right py-3 px-4 hidden md:table-cell">Listings</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const fav = isFavorite(itemKey(item));
            return (
              <tr key={itemKey(item)} className="border-b border-dungeon/15 hover:bg-coin/3 transition-colors group">
                <td className="py-2.5 px-4">
                  <button
                    onClick={() => onToggleFavorite(itemKey(item))}
                    className={`p-1 rounded transition-all ${
                      fav ? "text-yellow-400" : "text-muted/15 hover:text-muted/40 opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <Star size={12} className={fav ? "fill-yellow-400" : ""} />
                  </button>
                </td>
                <td className="py-2.5 px-4">
                  {(() => {
                    const link = itemLink(item);
                    const inner = (
                      <div className="flex items-center gap-2.5">
                        <ItemIcon itemId={item.skyblock_id} size={24} />
                        <span className="text-body-light font-medium truncate max-w-[220px]">{item.base_item || item.item_name}</span>
                      </div>
                    );
                    return link
                      ? <Link to={link} className="flex items-center gap-2.5 hover:text-coin transition-colors">{inner}</Link>
                      : inner;
                  })()}
                </td>
                <td className="py-2.5 px-4 hidden sm:table-cell">
                  <RarityBadge tier={item.tier} />
                </td>
                <td className="py-2.5 px-4 text-right">
                  <PriceDisplay amount={item.lowest_price} size="sm" />
                </td>
                <td className="py-2.5 px-4 text-right hidden md:table-cell font-mono text-muted">
                  {item.count}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({
  page, totalPages, offset, perPage, totalItems, setPage,
}: {
  page: number; totalPages: number; offset: number; perPage: number; totalItems: number;
  setPage: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button
        onClick={() => setPage(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="p-2 rounded-lg border border-dungeon/35 text-muted hover:text-body hover:border-dungeon/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={18} />
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
        .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
          if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("ellipsis");
          acc.push(p);
          return acc;
        }, [])
        .map((item, i) =>
          item === "ellipsis" ? (
            <span key={`e${i}`} className="px-1 text-muted/40">...</span>
          ) : (
            <button
              key={item}
              onClick={() => setPage(item)}
              className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all ${
                item === page
                  ? "bg-coin/10 text-coin border border-coin/25"
                  : "border border-dungeon/35 text-muted hover:text-body hover:border-dungeon/50"
              }`}
            >
              {item}
            </button>
          )
        )}

      <button
        onClick={() => setPage(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="p-2 rounded-lg border border-dungeon/35 text-muted hover:text-body hover:border-dungeon/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={18} />
      </button>

      <span className="text-muted text-xs ml-3">
        {offset + 1}–{Math.min(offset + perPage, totalItems)} of {totalItems.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Search tab ────────────────────────────────────────────────

interface SearchResultItem {
  base_item: string;
  skyblock_id?: string;
  lowest_price: number;
  count: number;
  tier?: string;
}

function AuctionSearchTab({
  setParam,
  searchParams,
}: {
  setParam: (u: Record<string, string | null>) => void;
  searchParams: URLSearchParams;
}) {
  const [input, setInput] = useState(searchParams.get("q") ?? "");
  const [debouncedTerm, setDebouncedTerm] = useState(input);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedTerm(input);
      setParam({ q: input || null });
    }, 300);
    return () => clearTimeout(timeout);
  }, [input]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: resp, isLoading, error } = useQuery({
    queryKey: ["auctionSearch", debouncedTerm],
    queryFn: () => searchAuctions(debouncedTerm),
    enabled: debouncedTerm.length > 0,
  });

  const rawData = resp?.data as unknown as { items?: SearchResultItem[]; count?: number } | SearchResultItem[] | undefined;
  const results: SearchResultItem[] = Array.isArray(rawData) ? rawData : (rawData?.items ?? []);
  const resultCount = Array.isArray(rawData) ? rawData.length : (rawData?.count ?? results.length);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted/50" />
        <input
          type="text"
          placeholder="Search auctions by name..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-nightstone border border-dungeon/40 text-body rounded-xl focus:outline-none focus:border-coin/40 placeholder:text-muted/40"
        />
      </div>

      {isLoading && <CardSkeleton />}
      {error && <ErrorState error={error} />}

      {results.length > 0 && (
        <>
          <div className="glass rounded-2xl overflow-hidden border border-dungeon/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dungeon/30 text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-4">Item</th>
                  <th className="text-right py-3 px-4">Lowest Price</th>
                  <th className="text-right py-3 px-4 hidden sm:table-cell">Listings</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, i) => (
                  <tr key={`${item.base_item}-${i}`} className="border-b border-dungeon/15 hover:bg-coin/3 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {item.skyblock_id && <ItemIcon itemId={item.skyblock_id} size={24} />}
                        <span className="text-body-light font-medium">{item.base_item}</span>
                        {item.tier && <RarityBadge tier={item.tier} />}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <PriceDisplay amount={item.lowest_price} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right hidden sm:table-cell font-mono text-muted">
                      {formatNumber(item.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted text-xs">{formatNumber(resultCount)} results</p>
        </>
      )}

      {debouncedTerm && !isLoading && results.length === 0 && (
        <p className="text-muted text-center py-16">No results found for &ldquo;{debouncedTerm}&rdquo;</p>
      )}
    </div>
  );
}

// ─── Player auctions tab ──────────────────────────────────────

function PlayerAuctionsTab() {
  const [input, setInput] = useState("");
  const [playerUuid, setPlayerUuid] = useState("");

  const { data: resp, isLoading, error } = useQuery({
    queryKey: ["playerAuctions", playerUuid],
    queryFn: () => getPlayerAuctions(playerUuid),
    enabled: playerUuid.length > 0,
  });

  const rawData = resp?.data;
  const auctions = Array.isArray(rawData)
    ? rawData as unknown as Record<string, unknown>[]
    : (rawData as Record<string, unknown> | undefined)?.auctions as Record<string, unknown>[] | undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPlayerUuid(input.trim());
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted/50" />
          <input
            type="text"
            placeholder="Player UUID or username..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-nightstone border border-dungeon/40 text-body rounded-xl focus:outline-none focus:border-coin/40 placeholder:text-muted/40"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-gradient-to-r from-coin to-coin-light text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-coin/15 transition-all hover:-translate-y-0.5 duration-200"
        >
          Lookup
        </button>
      </form>

      {isLoading && <CardSkeleton />}
      {error && <ErrorState error={error} />}

      {auctions && Array.isArray(auctions) && auctions.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden border border-dungeon/30">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dungeon/30 text-muted text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4">Auction ID</th>
                <th className="text-right py-3 px-4">Price</th>
                <th className="text-center py-3 px-4">Type</th>
              </tr>
            </thead>
            <tbody>
              {auctions.map((auction, i) => (
                <tr key={String(auction.auction_id ?? i)} className="border-b border-dungeon/15 hover:bg-coin/3 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs text-muted inline-flex items-center gap-1.5">
                      {truncateUuid(String(auction.auction_id ?? ''))}
                      <CopyButton text={String(auction.auction_id ?? '')} />
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <PriceDisplay amount={Number(auction.price ?? auction.starting_bid ?? 0)} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg ${
                      auction.bin
                        ? "bg-coin/8 text-coin border border-coin/15"
                        : "bg-dungeon/30 text-body border border-dungeon/30"
                    }`}>
                      {auction.bin ? "BIN" : "Auction"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {auctions && Array.isArray(auctions) && auctions.length === 0 && (
        <p className="text-muted text-center py-16">No auctions found for this player.</p>
      )}
    </div>
  );
}

// ─── Ended auctions tab ───────────────────────────────────────

interface EndedAuctionItem {
  auction_id: string;
  seller: string;
  buyer: string;
  timestamp: number;
  price: number;
  bin: boolean;
  [key: string]: unknown;
}

function EndedTab() {
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data: resp, isLoading, error } = useQuery({
    queryKey: ["endedAuctions"],
    queryFn: () => getEndedAuctions(),
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const rawData = resp?.data as unknown as { auctions?: EndedAuctionItem[]; count?: number } | EndedAuctionItem[] | undefined;
  const ended: EndedAuctionItem[] = Array.isArray(rawData) ? rawData : (rawData?.auctions ?? []);
  const endedCount = Array.isArray(rawData) ? rawData.length : (rawData?.count ?? ended.length);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2.5 text-sm text-muted cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="accent-coin w-4 h-4 rounded"
          />
          <span className="group-hover:text-body transition-colors">Auto-refresh (30s)</span>
        </label>
        {endedCount > 0 && (
          <span className="text-muted text-xs font-mono bg-dungeon/20 px-2.5 py-1 rounded-lg">{formatNumber(endedCount)} ended</span>
        )}
      </div>

      {isLoading && <CardSkeleton />}
      {error && <ErrorState error={error} />}

      {ended.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden border border-dungeon/30">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dungeon/30 text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-4">Auction ID</th>
                  <th className="text-right py-3 px-4">Price</th>
                  <th className="text-center py-3 px-4">Type</th>
                  <th className="text-left py-3 px-4 hidden lg:table-cell">Buyer</th>
                  <th className="text-left py-3 px-4 hidden lg:table-cell">Seller</th>
                  <th className="text-right py-3 px-4 hidden sm:table-cell">Time</th>
                </tr>
              </thead>
              <tbody>
                {ended.map((auction) => (
                  <tr key={auction.auction_id} className="border-b border-dungeon/15 hover:bg-coin/3 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs text-muted inline-flex items-center gap-1.5">
                        {truncateUuid(auction.auction_id)}
                        <CopyButton text={auction.auction_id} />
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <PriceDisplay amount={auction.price} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg ${
                        auction.bin
                          ? "bg-coin/8 text-coin border border-coin/15"
                          : "bg-dungeon/30 text-body border border-dungeon/30"
                      }`}>
                        {auction.bin ? "BIN" : "Auction"}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className="font-mono text-xs text-muted inline-flex items-center gap-1.5">
                        {truncateUuid(auction.buyer)}
                        <CopyButton text={auction.buyer} />
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className="font-mono text-xs text-muted inline-flex items-center gap-1.5">
                        {truncateUuid(auction.seller)}
                        <CopyButton text={auction.seller} />
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right hidden sm:table-cell text-muted text-xs">
                      {formatDate(auction.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Live indicator ────────────────────────────────────────────

function AuctionLiveIndicator() {
  const { sseActive, updateCount } = useAuctionSseLiveStatus();
  if (!sseActive && updateCount === 0) return null;
  return <LiveDot active={sseActive} />;
}
