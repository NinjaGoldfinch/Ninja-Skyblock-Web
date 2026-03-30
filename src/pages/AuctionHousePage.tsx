import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getLowestBins,
  searchAuctions,
  getPlayerAuctions,
  getEndedAuctions,
} from "@/api/endpoints";
import { DataCard } from "@/components/ui/DataCard";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { ItemRarity } from "@/components/ui/ItemRarity";
import { CopyButton } from "@/components/ui/CopyButton";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDate, truncateUuid, formatNumber } from "@/lib/format";

type Tab = "lowest-bins" | "search" | "player" | "ended";

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

interface SearchResultItem {
  base_item: string;
  lowest_price: number;
  count: number;
}

interface EndedAuctionItem {
  auction_id: string;
  seller: string;
  buyer: string;
  timestamp: number;
  price: number;
  bin: boolean;
  item_bytes?: string;
  [key: string]: unknown;
}

function LowestBinsTab() {
  const [search, setSearch] = useState("");
  const { data: resp, isLoading, error } = useQuery({
    queryKey: ["lowestBins"],
    queryFn: () => getLowestBins(),
  });

  const rawData = resp?.data as unknown as { items: LowestBinItem[]; count: number } | undefined;
  const bins = rawData?.items;

  if (isLoading) return <CardSkeleton />;
  if (error) return <ErrorState error={error} />;

  const filtered = bins?.filter((item) => {
    const term = search.toLowerCase();
    return (
      item.item_name?.toLowerCase().includes(term) ||
      item.base_item?.toLowerCase().includes(term) ||
      item.skyblock_id?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-3 bg-nightstone border border-dungeon/50 text-body rounded-xl focus:outline-none focus:border-coin/50 placeholder:text-muted/50"
        />
        {rawData?.count != null && (
          <span className="text-muted text-sm font-mono bg-dungeon/30 px-2.5 py-1 rounded-lg">{formatNumber(rawData.count)} items</span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered?.map((item) => (
          <DataCard key={item.skyblock_id} className="hover:border-coin/30 transition-all duration-200">
            <div className="space-y-2.5">
              <ItemRarity name={item.item_name || item.base_item} tier={item.tier} />
              <PriceDisplay amount={item.lowest_price} />
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs text-muted">{item.skyblock_id}</span>
                {item.count > 1 && (
                  <span className="text-xs text-muted bg-dungeon/30 px-1.5 py-0.5 rounded-md">x{item.count}</span>
                )}
              </div>
            </div>
          </DataCard>
        ))}
      </div>
      {filtered?.length === 0 && (
        <p className="text-muted text-center py-12">No items found.</p>
      )}
    </div>
  );
}

function SearchTab() {
  const [input, setInput] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedTerm(input);
    }, 300);
    return () => clearTimeout(timeout);
  }, [input]);

  const { data: resp, isLoading, error } = useQuery({
    queryKey: ["auctionSearch", debouncedTerm],
    queryFn: () => searchAuctions(debouncedTerm),
    enabled: debouncedTerm.length > 0,
  });

  const rawData = resp?.data as unknown as { items: SearchResultItem[]; count: number } | undefined;
  const results = rawData?.items;

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search auctions..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full px-4 py-3 bg-nightstone border border-dungeon/50 text-body rounded-xl focus:outline-none focus:border-coin/50 placeholder:text-muted/50"
      />
      {isLoading && <CardSkeleton />}
      {error && <ErrorState error={error} />}
      {results && results.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-dungeon/40">
          <table className="w-full text-sm text-body">
            <thead>
              <tr className="bg-void/40 text-muted text-left">
                <th className="py-3 px-4 text-xs font-medium">Item</th>
                <th className="py-3 px-4 text-xs font-medium">Lowest Price</th>
                <th className="py-3 px-4 text-xs font-medium">Listings</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item, i) => (
                <tr
                  key={`${item.base_item}-${i}`}
                  className="border-t border-dungeon/20 hover:bg-coin/3 transition-colors"
                >
                  <td className="py-3 px-4 font-medium">{item.base_item}</td>
                  <td className="py-3 px-4">
                    <PriceDisplay amount={item.lowest_price} />
                  </td>
                  <td className="py-3 px-4 font-mono text-muted">
                    {formatNumber(item.count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {results && results.length === 0 && (
        <p className="text-muted text-center py-12">No results found.</p>
      )}
      {rawData?.count != null && results && results.length > 0 && (
        <p className="text-muted text-sm">{formatNumber(rawData.count)} results</p>
      )}
    </div>
  );
}

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
        <input
          type="text"
          placeholder="Player UUID or username..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-3 bg-nightstone border border-dungeon/50 text-body rounded-xl focus:outline-none focus:border-coin/50 placeholder:text-muted/50"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-gradient-to-r from-coin to-coin-light text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-coin/20 transition-all"
        >
          Lookup
        </button>
      </form>
      {isLoading && <CardSkeleton />}
      {error && <ErrorState error={error} />}
      {auctions && Array.isArray(auctions) && auctions.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-dungeon/40">
          <table className="w-full text-sm text-body">
            <thead>
              <tr className="bg-void/40 text-muted text-left">
                <th className="py-3 px-4 text-xs font-medium">Auction ID</th>
                <th className="py-3 px-4 text-xs font-medium">Price</th>
                <th className="py-3 px-4 text-xs font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {auctions.map((auction, i) => (
                <tr
                  key={String(auction.auction_id ?? i)}
                  className="border-t border-dungeon/20 hover:bg-coin/3 transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-xs text-muted">
                    {truncateUuid(String(auction.auction_id ?? ''))}
                    <CopyButton text={String(auction.auction_id ?? '')} />
                  </td>
                  <td className="py-3 px-4">
                    <PriceDisplay amount={Number(auction.price ?? auction.starting_bid ?? 0)} />
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
                      auction.bin
                        ? "bg-coin/10 text-coin border border-coin/20"
                        : "bg-dungeon/40 text-body border border-dungeon/40"
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
        <p className="text-muted text-center py-12">
          No auctions found for this player.
        </p>
      )}
    </div>
  );
}

function EndedTab() {
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data: resp, isLoading, error } = useQuery({
    queryKey: ["endedAuctions"],
    queryFn: () => getEndedAuctions(),
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const rawData = resp?.data as unknown as { auctions: EndedAuctionItem[]; count: number } | undefined;
  const ended = rawData?.auctions;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2.5 text-sm text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="accent-coin w-4 h-4 rounded"
          />
          Auto-refresh (30s)
        </label>
        {rawData?.count != null && (
          <span className="text-muted text-sm font-mono bg-dungeon/30 px-2.5 py-1 rounded-lg">{formatNumber(rawData.count)} ended</span>
        )}
      </div>
      {isLoading && <CardSkeleton />}
      {error && <ErrorState error={error} />}
      {ended && ended.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-dungeon/40">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-body">
              <thead>
                <tr className="bg-void/40 text-muted text-left">
                  <th className="py-3 px-4 text-xs font-medium">Auction ID</th>
                  <th className="py-3 px-4 text-xs font-medium">Price</th>
                  <th className="py-3 px-4 text-xs font-medium">Type</th>
                  <th className="py-3 px-4 text-xs font-medium">Buyer</th>
                  <th className="py-3 px-4 text-xs font-medium">Seller</th>
                  <th className="py-3 px-4 text-xs font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {ended.map((auction) => (
                  <tr
                    key={auction.auction_id}
                    className="border-t border-dungeon/20 hover:bg-coin/3 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-muted">
                      {truncateUuid(auction.auction_id)}
                      <CopyButton text={auction.auction_id} />
                    </td>
                    <td className="py-3 px-4">
                      <PriceDisplay amount={auction.price} />
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
                        auction.bin
                          ? "bg-coin/10 text-coin border border-coin/20"
                          : "bg-dungeon/40 text-body border border-dungeon/40"
                      }`}>
                        {auction.bin ? "BIN" : "Auction"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted">
                      {truncateUuid(auction.buyer)}
                      <CopyButton text={auction.buyer} />
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted">
                      {truncateUuid(auction.seller)}
                      <CopyButton text={auction.seller} />
                    </td>
                    <td className="py-3 px-4 text-muted text-xs">
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

const tabs: { key: Tab; label: string }[] = [
  { key: "lowest-bins", label: "Lowest BINs" },
  { key: "search", label: "Search" },
  { key: "player", label: "Player Auctions" },
  { key: "ended", label: "Ended" },
];

export default function AuctionHousePage() {
  const [activeTab, setActiveTab] = useState<Tab>("lowest-bins");

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-4xl font-display text-gradient-coin font-bold">Auction House</h1>

      <div className="flex gap-1 border-b border-dungeon/40">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium transition-all rounded-t-xl ${
              activeTab === tab.key
                ? "border-b-2 border-coin text-coin bg-coin/5"
                : "text-muted hover:text-body hover:bg-dungeon/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "lowest-bins" && <LowestBinsTab />}
        {activeTab === "search" && <SearchTab />}
        {activeTab === "player" && <PlayerAuctionsTab />}
        {activeTab === "ended" && <EndedTab />}
      </div>
    </div>
  );
}
