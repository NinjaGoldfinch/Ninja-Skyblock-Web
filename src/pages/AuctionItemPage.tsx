import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AreaSeries, HistogramSeries, LineType } from "lightweight-charts";
import type { ISeriesApi } from "lightweight-charts";
import {
  ArrowLeft, Star, Tag, Layers, Clock, DollarSign,
  TrendingDown, TrendingUp, BarChart3, Package,
} from "lucide-react";
import { getLowestBinItem, getItem } from "@/api/endpoints";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { RarityBadge } from "@/components/ui/ItemRarity";
import { DataCard } from "@/components/ui/DataCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuctionSseLiveStatus } from "@/hooks/useAuctionSseLiveStatus";
import { useAuctionHistory } from "@/hooks/useAuctionHistory";
import { subscribeAuctionEvents } from "@/lib/auctionEventBus";
import type { AuctionHistoryDatapoint } from "@/types/api";
import { useChart } from "@/hooks/useChart";
import { LiveDot } from "@/components/ui/LiveDot";
import { formatNumber, formatCoins, truncateUuid, toLocalChartTime } from "@/lib/format";

// ─── Types ─────────────────────────────────────────────────────

interface AuctionListing {
  item_name: string;
  price: number;
  auction_id: string;
  seller_uuid: string;
  ends_at: number;
  tier: string;
  category: string;
}

interface AuctionItemDetail {
  skyblock_id: string;
  base_item: string;
  lowest: AuctionListing;
  listings: AuctionListing[];
  count: number;
}

interface ItemMeta {
  id: string;
  name: string;
  material?: string;
  tier?: string;
  category?: string;
  npc_sell_price?: number;
  is_auctionable?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────

function formatCountdown(endsAt: number): string {
  const diff = endsAt - Date.now();
  if (diff <= 0) return "Ended";
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatCategory(cat: string | undefined): string {
  if (!cat) return "Unknown";
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Page ──────────────────────────────────────────────────────

export default function AuctionItemPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();

  const {
    data: auctionResp,
    isLoading: auctionLoading,
    isError: auctionError,
    error: auctionErrorData,
  } = useQuery({
    queryKey: ["auction-item", itemId],
    queryFn: () => getLowestBinItem(itemId!),
    enabled: !!itemId,
  });

  const { data: itemResp } = useQuery({
    queryKey: ["item-meta", itemId],
    queryFn: () => getItem(itemId!),
    enabled: !!itemId,
    staleTime: 600_000,
  });

  const auction = auctionResp?.data as unknown as AuctionItemDetail | undefined;
  const itemMeta = itemResp?.data as unknown as ItemMeta | undefined;
  const { sseActive } = useAuctionSseLiveStatus(itemId);

  if (!itemId) return null;

  if (auctionLoading) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
        <BackLink />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (auctionError || !auction) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
        <BackLink />
        <ErrorState
          error={auctionErrorData instanceof Error ? auctionErrorData : new Error("No auction data found for this item.")}
        />
      </div>
    );
  }

  const listings = auction.listings ?? [];
  const prices = listings.map((l) => l.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const displayName = auction.base_item || itemMeta?.name || itemId;
  const tier = auction.lowest?.tier || itemMeta?.tier || "";
  const category = auction.lowest?.category || itemMeta?.category || "";
  const fav = isFavorite(itemId);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
      {/* Back link */}
      <BackLink />

      {/* Header */}
      <div className="flex items-start gap-4">
        <ItemIcon itemId={itemId} size={56} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-3xl text-gradient-coin font-bold">{displayName}</h1>
            <RarityBadge tier={tier} />
            <LiveDot active={sseActive} />
            <button
              onClick={() => toggleFavorite(itemId)}
              className={`p-1.5 rounded-lg transition-all ${
                fav
                  ? "text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20"
                  : "text-muted/30 hover:text-muted/60"
              }`}
              aria-label={fav ? "Remove from watchlist" : "Add to watchlist"}
            >
              <Star size={18} className={fav ? "fill-yellow-400" : ""} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 group/id">
            <span className="text-muted font-mono text-xs bg-dungeon/25 px-2 py-0.5 rounded-md">{itemId}</span>
            <div className="opacity-0 group-hover/id:opacity-100 transition-opacity">
              <CopyButton text={itemId} />
            </div>
          </div>
        </div>
      </div>

      {/* Price overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
        {/* Lowest BIN */}
        <DataCard>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-enchant/10 flex items-center justify-center">
              <TrendingDown size={16} className="text-enchant" />
            </div>
            <span className="text-sm font-medium text-body-light">Lowest BIN</span>
          </div>
          <PriceDisplay amount={auction.lowest?.price ?? minPrice} size="lg" />
          {auction.lowest?.ends_at && (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-muted">
              <Clock size={12} />
              Ends in {formatCountdown(auction.lowest.ends_at)}
            </div>
          )}
          {auction.lowest?.seller_uuid && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted">
              Seller: <span className="font-mono">{truncateUuid(auction.lowest.seller_uuid)}</span>
              <CopyButton text={auction.lowest.seller_uuid} />
            </div>
          )}
        </DataCard>

        {/* Price Range */}
        <DataCard>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-coin/10 flex items-center justify-center">
              <BarChart3 size={16} className="text-coin" />
            </div>
            <span className="text-sm font-medium text-body-light">Price Range</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted flex items-center gap-1.5">
                <TrendingDown size={11} className="text-enchant" /> Low
              </span>
              <PriceDisplay amount={minPrice} size="sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted flex items-center gap-1.5">
                <TrendingUp size={11} className="text-gold" /> High
              </span>
              <PriceDisplay amount={maxPrice} size="sm" />
            </div>
            <div className="pt-2 border-t border-dungeon/25 flex justify-between items-center">
              <span className="text-xs text-muted flex items-center gap-1.5">
                <DollarSign size={11} className="text-coin-light" /> Avg
              </span>
              <PriceDisplay amount={Math.round(avgPrice)} size="sm" />
            </div>
          </div>
        </DataCard>

        {/* Market Info */}
        <DataCard>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
              <Package size={16} className="text-gold" />
            </div>
            <span className="text-sm font-medium text-body-light">Market Info</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted flex items-center gap-1.5">
                <Layers size={11} /> Listings
              </span>
              <span className="font-mono text-sm text-body">{formatNumber(auction.count)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted flex items-center gap-1.5">
                <Tag size={11} /> Category
              </span>
              <span className="text-sm text-body">{formatCategory(category)}</span>
            </div>
            {itemMeta?.npc_sell_price != null && itemMeta.npc_sell_price > 0 && (
              <div className="pt-2 border-t border-dungeon/25 flex justify-between items-center">
                <span className="text-xs text-muted">NPC Sell</span>
                <PriceDisplay amount={itemMeta.npc_sell_price} size="sm" />
              </div>
            )}
          </div>
        </DataCard>
      </div>

      {/* Price History Chart */}
      <AuctionChart itemId={itemId} />

      {/* Listings table */}
      {listings.length > 0 && (
        <DataCard title="Active Listings">
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dungeon/30 text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-2.5 pr-4 w-10">#</th>
                  <th className="text-right py-2.5 px-4">Price</th>
                  <th className="text-left py-2.5 px-4 hidden sm:table-cell">Seller</th>
                  <th className="text-right py-2.5 px-4 hidden md:table-cell">Ends In</th>
                  <th className="text-left py-2.5 pl-4 hidden lg:table-cell">Auction ID</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing, i) => {
                  const isLowest = i === 0;
                  return (
                    <tr
                      key={listing.auction_id}
                      className={`border-b border-dungeon/15 hover:bg-coin/3 transition-colors ${isLowest ? "bg-enchant/[0.02]" : ""}`}
                    >
                      <td className="py-2.5 pr-4">
                        <span className={`font-mono text-xs ${isLowest ? "text-enchant font-semibold" : "text-muted"}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <PriceDisplay amount={listing.price} size="sm" />
                      </td>
                      <td className="py-2.5 px-4 hidden sm:table-cell">
                        <span className="font-mono text-xs text-muted inline-flex items-center gap-1.5">
                          {truncateUuid(listing.seller_uuid)}
                          <CopyButton text={listing.seller_uuid} />
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right hidden md:table-cell">
                        <span className={`text-xs font-mono ${
                          listing.ends_at - Date.now() < 3_600_000 ? "text-damage" : "text-muted"
                        }`}>
                          {formatCountdown(listing.ends_at)}
                        </span>
                      </td>
                      <td className="py-2.5 pl-4 hidden lg:table-cell">
                        <span className="font-mono text-xs text-muted/60 inline-flex items-center gap-1.5">
                          {truncateUuid(listing.auction_id)}
                          <CopyButton text={listing.auction_id} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {auction.count > listings.length && (
            <p className="text-muted text-xs mt-3 text-center">
              Showing {listings.length} of {formatNumber(auction.count)} listings
            </p>
          )}
        </DataCard>
      )}

      {/* Item metadata */}
      {itemMeta && (
        <DataCard title="Item Details">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetaStat label="Category" value={formatCategory(itemMeta.category)} />
            <MetaStat label="Tier" value={formatCategory(itemMeta.tier)} />
            <MetaStat label="Material" value={formatCategory(itemMeta.material)} />
            <MetaStat label="Auctionable" value={itemMeta.is_auctionable ? "Yes" : "No"} />
          </div>
        </DataCard>
      )}
    </div>
  );
}

function BackLink() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      className="group inline-flex items-center gap-1.5 text-muted hover:text-coin text-sm transition-colors"
    >
      <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
      Back
    </button>
  );
}

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-void/30 border border-dungeon/15">
      <p className="text-muted text-[10px] uppercase tracking-[0.12em] mb-1 font-medium">{label}</p>
      <p className="text-body text-sm font-medium">{value}</p>
    </div>
  );
}

// ─── Price History Chart ───────────────────────────────────────

type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";
const RANGES: TimeRange[] = ["1h", "6h", "24h", "7d", "30d"];

const RANGE_DURATION_MS: Record<TimeRange, number> = {
  "1h": 3_600_000,
  "6h": 21_600_000,
  "24h": 86_400_000,
  "7d": 604_800_000,
  "30d": 2_592_000_000,
};

function AuctionChart({ itemId }: { itemId: string }) {
  const [range, setRange] = useState<TimeRange>("24h");
  const { containerRef, chartRef, chartReady } = useChart({ height: 380 });
  const { datapoints: fetchedDatapoints, summary, sparse, loading, error } = useAuctionHistory(itemId, range);

  // Live datapoints: fetched + SSE appended
  const [livePoints, setLivePoints] = useState<AuctionHistoryDatapoint[]>([]);
  const livePointsRef = useRef(livePoints);
  livePointsRef.current = livePoints;

  // Reset live points when fetched data changes
  useEffect(() => {
    setLivePoints([]);
  }, [fetchedDatapoints]);

  // Merge fetched + live, deduplicate by timestamp
  const datapoints = (() => {
    if (livePoints.length === 0) return fetchedDatapoints;
    const merged = [...fetchedDatapoints, ...livePoints];
    const seen = new Set<number>();
    const deduped: AuctionHistoryDatapoint[] = [];
    for (const dp of merged) {
      if (!seen.has(dp.timestamp)) {
        seen.add(dp.timestamp);
        deduped.push(dp);
      }
    }
    // Prune old points outside range window
    const cutoff = Date.now() - RANGE_DURATION_MS[range];
    return deduped.filter((d) => d.timestamp > cutoff).sort((a, b) => a.timestamp - b.timestamp);
  })();

  // Subscribe to SSE auction events for live append
  useEffect(() => {
    const unsub = subscribeAuctionEvents((event) => {
      if (event.type !== 'auction:lowest-bin-change' && event.type !== 'auction:new_lowest_bin') return;
      if (event.skyblockId !== itemId && event.itemId !== itemId) return;

      const raw = event.raw;
      const newPoint: AuctionHistoryDatapoint = {
        timestamp: event.timestamp,
        lowest_bin: (raw.new_price as number) ?? event.price,
        median_bin: null,
        listing_count: 0,
        sale_count: 0,
        avg_sale_price: null,
      };

      setLivePoints((prev) => {
        const cutoff = Date.now() - RANGE_DURATION_MS[range];
        return [...prev.filter((p) => p.timestamp > cutoff), newPoint];
      });
    });
    return unsub;
  }, [itemId, range]);

  const seriesCreatedRef = useRef(false);
  const lowestSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const medianSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const listingSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const prevSparseRef = useRef(sparse);
  const prevRangeRef = useRef(range);
  const initialFitDoneRef = useRef(false);
  const prevChartReadyRef = useRef(chartReady);
  const datapointsMapRef = useRef<Map<number, AuctionHistoryDatapoint>>(new Map());

  // Update chart series
  useEffect(() => {
    // Reset series refs when chart instance changes (remount)
    if (prevChartReadyRef.current !== chartReady) {
      prevChartReadyRef.current = chartReady;
      seriesCreatedRef.current = false;
      lowestSeriesRef.current = null;
      medianSeriesRef.current = null;
      listingSeriesRef.current = null;
      initialFitDoneRef.current = false;
    }
    const chart = chartRef.current;
    if (!chart) return;

    // Clear when empty
    if (!datapoints.length) {
      if (lowestSeriesRef.current) lowestSeriesRef.current.setData([]);
      if (medianSeriesRef.current) medianSeriesRef.current.setData([]);
      if (listingSeriesRef.current) listingSeriesRef.current.setData([]);
      return;
    }

    // Create or recreate series when sparse mode changes
    const sparseChanged = prevSparseRef.current !== sparse;
    prevSparseRef.current = sparse;

    if (!seriesCreatedRef.current || sparseChanged) {
      // Remove old series if recreating
      if (seriesCreatedRef.current) {
        if (lowestSeriesRef.current) chart.removeSeries(lowestSeriesRef.current);
        if (medianSeriesRef.current) chart.removeSeries(medianSeriesRef.current);
        if (listingSeriesRef.current) chart.removeSeries(listingSeriesRef.current);
      }

      const lineType = sparse ? LineType.WithSteps : LineType.Simple;

      lowestSeriesRef.current = chart.addSeries(AreaSeries, {
        lineColor: "#3b82f6",
        topColor: "rgba(59, 130, 246, 0.20)",
        bottomColor: "rgba(59, 130, 246, 0.02)",
        lineWidth: 2,
        lineType,
        title: "Lowest BIN",
        priceFormat: { type: "custom", formatter: (p: number) => formatCoins(p) },
      });

      medianSeriesRef.current = chart.addSeries(AreaSeries, {
        lineColor: "#8b5cf6",
        topColor: "rgba(139, 92, 246, 0.08)",
        bottomColor: "rgba(139, 92, 246, 0.01)",
        lineWidth: 1,
        lineStyle: 2,
        lineType,
        title: "Median BIN",
        priceFormat: { type: "custom", formatter: (p: number) => formatCoins(p) },
      });

      listingSeriesRef.current = chart.addSeries(HistogramSeries, {
        color: "rgba(107, 114, 128, 0.3)",
        priceFormat: { type: "volume" },
        priceScaleId: "",
        lastValueVisible: false,
      });

      // Histogram occupies bottom 15%
      chart.priceScale("").applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });

      // Price lines occupy top 80% with a gap above the histogram
      chart.priceScale("right").applyOptions({
        scaleMargins: { top: 0.05, bottom: 0.18 },
      });

      seriesCreatedRef.current = true;
    }

    if (!lowestSeriesRef.current || !medianSeriesRef.current || !listingSeriesRef.current) return;

    // Percentile-based autoscale on lowest_bin only — excludes median outlier spikes
    const lowestPrices = datapoints.map((d) => d.lowest_bin).filter((p) => p > 0).sort((a, b) => a - b);
    if (lowestPrices.length > 2) {
      const p5 = lowestPrices[Math.floor(lowestPrices.length * 0.05)]!;
      const p95 = lowestPrices[Math.floor(lowestPrices.length * 0.95)]!;
      const priceRange = p95 - p5;
      const pad = Math.max(priceRange * 0.2, p5 * 0.03);
      const rangeMin = Math.max(0, p5 - pad);
      const rangeMax = p95 + pad;
      const provider = () => ({ priceRange: { minValue: rangeMin, maxValue: rangeMax } });
      lowestSeriesRef.current.applyOptions({ autoscaleInfoProvider: provider });
      medianSeriesRef.current.applyOptions({ autoscaleInfoProvider: provider });
    }

    lowestSeriesRef.current.setData(datapoints.map((d) => ({
      time: toLocalChartTime(d.timestamp),
      value: d.lowest_bin || 0.01,
    })));

    medianSeriesRef.current.setData(
      datapoints
        .filter((d) => d.median_bin != null && d.median_bin > 0)
        .map((d) => ({ time: toLocalChartTime(d.timestamp), value: d.median_bin! }))
    );

    // Histogram bars: show listing_count when available, otherwise sale_count
    // Green bars = sales activity, blue bars = listing snapshots
    const histogramBars = datapoints
      .filter((d) => d.listing_count > 0 || d.sale_count > 0)
      .map((d) => ({
        time: toLocalChartTime(d.timestamp),
        value: d.listing_count > 0 ? d.listing_count : d.sale_count,
        color: d.sale_count > 0 ? "rgba(52, 211, 153, 0.4)" : "rgba(59, 130, 246, 0.15)",
      }));
    listingSeriesRef.current.setData(histogramBars);

    // Build lookup map for tooltip (keyed by chart time in seconds)
    const map = new Map<number, AuctionHistoryDatapoint>();
    for (const d of datapoints) {
      map.set(toLocalChartTime(d.timestamp), d);
    }
    datapointsMapRef.current = map;

    // Only fitContent on initial load or range/sparse change — not on SSE appends
    const rangeChanged = prevRangeRef.current !== range;
    prevRangeRef.current = range;
    if (!initialFitDoneRef.current || rangeChanged) {
      chart.timeScale().fitContent();
      initialFitDoneRef.current = true;
    }
  }, [datapoints, range, sparse, chartReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Crosshair tooltip
  const [tooltip, setTooltip] = useState<{ x: number; y: number; dp: AuctionHistoryDatapoint } | null>(null);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const handler = (param: { point?: { x: number; y: number }; time?: unknown }) => {
      if (!param.point || param.time == null || !containerRef.current) {
        setTooltip(null);
        return;
      }
      const dp = datapointsMapRef.current.get(param.time as number);
      if (!dp) { setTooltip(null); return; }
      setTooltip({ x: param.point.x, y: param.point.y, dp });
    };

    chart.subscribeCrosshairMove(handler as Parameters<typeof chart.subscribeCrosshairMove>[0]);
    return () => chart.unsubscribeCrosshairMove(handler as Parameters<typeof chart.unsubscribeCrosshairMove>[0]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect if all data is backfilled
  const allBackfilled = datapoints.length > 0 && datapoints.every((d) => d.listing_count === 0);

  return (
    <DataCard>
      {/* Range selector */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-gradient-coin text-sm uppercase tracking-[0.14em] font-semibold">
          Price History
        </h3>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                range === r
                  ? "bg-coin/10 text-coin border border-coin/25"
                  : "text-muted hover:text-body bg-void/30 border border-transparent hover:border-dungeon/30"
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      {summary && <AuctionStatsBar summary={summary} />}

      {/* Chart */}
      {/* Chart - always mounted to preserve lightweight-charts instance */}
      <div className="relative">
        {loading && !datapoints.length && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-void/60 rounded-xl">
            <div className="text-muted text-sm animate-pulse-glow">Loading chart data...</div>
          </div>
        )}
        {!loading && !error && datapoints.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center bg-void/80 rounded-xl">
            <BarChart3 size={32} className="text-muted/20 mb-3" />
            <p className="text-muted text-sm">No price history for this range.</p>
            <p className="text-muted/50 text-xs mt-1">Try a longer range or check back later.</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-void/80 rounded-xl">
            <p className="text-muted text-sm">Failed to load price history.</p>
          </div>
        )}
        <div ref={containerRef} className="w-full rounded-xl overflow-hidden" style={{ minHeight: 380 }} />
        {tooltip && (
          <ChartTooltip x={tooltip.x} y={tooltip.y} dp={tooltip.dp} containerRef={containerRef} />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-[11px] text-muted flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full bg-[#3b82f6]" /> Lowest BIN
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full bg-[#8b5cf6] opacity-60" /> Median BIN
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-enchant/40" /> Sales
        </span>
        {!allBackfilled && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-[#3b82f6]/15" /> Listings
          </span>
        )}
        {allBackfilled && (
          <span className="ml-auto text-gold/40 text-[10px]">Historical data from sales records</span>
        )}
        <span className="ml-auto text-muted/30 text-[10px]">Hover for details</span>
      </div>
    </DataCard>
  );
}

function AuctionStatsBar({ summary }: { summary: import("@/types/api").AuctionHistorySummary }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-4">
      <StatCell label="Avg" value={formatCoins(summary.avg_lowest_bin)} color="text-body" />
      <StatCell label="Low" value={formatCoins(summary.min_lowest_bin)} color="text-enchant" />
      <StatCell label="High" value={formatCoins(summary.max_lowest_bin)} color="text-gold" />
      <StatCell label="Sales" value={String(summary.total_sales)} color="text-coin-light" />
      <StatCell
        label="Avg Sale"
        value={summary.avg_sale_price != null ? formatCoins(summary.avg_sale_price) : "—"}
        color="text-enchant/70"
      />
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-2.5 rounded-xl bg-void/30 border border-dungeon/15">
      <p className="text-muted text-[10px] uppercase tracking-[0.12em] mb-0.5 font-medium">{label}</p>
      <p className={`font-mono text-sm font-medium ${color}`}>{value}</p>
    </div>
  );
}

function ChartTooltip({
  x, y, dp, containerRef,
}: {
  x: number;
  y: number;
  dp: AuctionHistoryDatapoint;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const containerW = containerRef.current?.clientWidth ?? 800;
  // Flip tooltip to left side when near right edge
  const flipX = x > containerW - 220;
  const left = flipX ? x - 210 : x + 16;
  const top = Math.max(8, Math.min(y - 10, 320));

  const time = new Date(dp.timestamp);
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = time.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  return (
    <div
      className="absolute z-20 pointer-events-none animate-fade-in"
      style={{ left, top, animationDuration: '0.1s' }}
    >
      <div className="glass-heavy rounded-xl border border-dungeon/30 px-3.5 py-2.5 min-w-[190px] shadow-xl shadow-black/30">
        <p className="text-muted text-[10px] font-mono mb-2">{timeStr} · {dateStr}</p>

        <div className="space-y-1.5">
          <TooltipRow color="#3b82f6" label="Lowest BIN" value={formatCoins(dp.lowest_bin)} />
          {dp.median_bin != null && dp.median_bin > 0 && (
            <TooltipRow color="#8b5cf6" label="Median BIN" value={formatCoins(dp.median_bin)} />
          )}
          {dp.listing_count > 0 && (
            <TooltipRow color="#6b7280" label="Listings" value={String(dp.listing_count)} />
          )}
        </div>

        {dp.sale_count > 0 && (
          <div className="mt-2 pt-2 border-t border-dungeon/25 space-y-1.5">
            <TooltipRow
              color="#34d399"
              label={dp.sale_count === 1 ? "1 Sale" : `${dp.sale_count} Sales`}
              value={dp.avg_sale_price != null ? formatCoins(dp.avg_sale_price) : "—"}
              highlight
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TooltipRow({ color, label, value, highlight }: { color: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[11px]">
      <span className="flex items-center gap-1.5 text-muted">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className={`font-mono font-medium ${highlight ? 'text-enchant' : 'text-body-light'}`}>{value}</span>
    </div>
  );
}
