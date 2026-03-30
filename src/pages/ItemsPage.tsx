import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { getItems, getItem, lookupItemName } from "@/api/endpoints";
import { DataCard } from "@/components/ui/DataCard";
import { ItemRarity, RarityBadge } from "@/components/ui/ItemRarity";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import type { ItemV2 } from "@/types/api";

const TIERS = [
  "All",
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
  "MYTHIC",
] as const;

export default function ItemsPage() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [lookupInput, setLookupInput] = useState("");
  const [lookupResult, setLookupResult] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const {
    data: itemsResp,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["items"],
    queryFn: () => getItems(),
  });

  const rawData = itemsResp?.data as unknown as { items: ItemV2[]; count: number } | ItemV2[] | undefined;
  const items: ItemV2[] | undefined = Array.isArray(rawData) ? rawData : rawData?.items;

  const { data: selectedItemResp } = useQuery({
    queryKey: ["item", selectedItemId],
    queryFn: () => getItem(selectedItemId!),
    enabled: !!selectedItemId,
  });

  const selectedItemDetail: ItemV2 | undefined = selectedItemResp?.data as unknown as ItemV2 | undefined;

  const categories = useMemo(() => {
    if (!items) return [];
    const unique = [...new Set(items.map((i) => i.category).filter(Boolean))];
    return unique.sort() as string[];
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesTier = tierFilter === "All" || item.tier === tierFilter;
      const matchesCategory =
        categoryFilter === "All" || item.category === categoryFilter;
      return matchesSearch && matchesTier && matchesCategory;
    });
  }, [items, search, tierFilter, categoryFilter]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupInput.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const result = await lookupItemName(lookupInput.trim());
      setLookupResult(result.data.skyblock_id);
    } catch {
      setLookupResult("Not found");
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-4xl font-display text-gradient-coin font-bold">Items Database</h1>

      {/* Name to ID lookup widget */}
      <DataCard>
        <h2 className="text-xs font-semibold text-muted mb-3 uppercase tracking-wider">
          Name to ID Lookup
        </h2>
        <form onSubmit={handleLookup} className="flex gap-3">
          <input
            type="text"
            placeholder="Item name..."
            value={lookupInput}
            onChange={(e) => setLookupInput(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-void/50 border border-dungeon/50 text-body rounded-xl text-sm focus:outline-none focus:border-coin/50 placeholder:text-muted/50"
          />
          <button
            type="submit"
            disabled={lookupLoading}
            className="px-5 py-2.5 bg-gradient-to-r from-coin to-coin-light text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-coin/20 transition-all disabled:opacity-50"
          >
            {lookupLoading ? "..." : "Lookup"}
          </button>
        </form>
        {lookupResult && (
          <p className="mt-3 font-mono text-sm text-body">
            Skyblock ID:{" "}
            <span className="text-coin font-semibold">{lookupResult}</span>
          </p>
        )}
      </DataCard>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search items by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-3 bg-nightstone border border-dungeon/50 text-body rounded-xl focus:outline-none focus:border-coin/50 placeholder:text-muted/50"
        />
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="px-4 py-3 bg-nightstone border border-dungeon/50 text-body rounded-xl focus:outline-none focus:border-coin/50"
        >
          {TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {tier === "All" ? "All Tiers" : tier}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-3 bg-nightstone border border-dungeon/50 text-body rounded-xl focus:outline-none focus:border-coin/50"
        >
          <option value="All">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <LoadingSkeleton />}
      {error && <ErrorState error={error instanceof Error ? error : new Error("Failed to fetch items")} />}

      <div className="flex gap-0">
        {/* Items list */}
        <div
          className={`flex-1 space-y-1 ${selectedItemId ? "mr-80" : ""} transition-all`}
        >
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItemId(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                selectedItemId === item.id
                  ? "glass border border-coin/20 shadow-sm"
                  : "hover:bg-nightstone/60"
              }`}
            >
              <div className="flex-1 min-w-0">
                <ItemRarity name={item.name} tier={item.tier} />
              </div>
              <span className="font-mono text-xs text-muted shrink-0">
                {item.id}
              </span>
              <RarityBadge tier={item.tier} />
              {item.category && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-muted/20 text-muted bg-muted/5">
                  {item.category}
                </span>
              )}
            </div>
          ))}
          {filtered.length === 0 && !isLoading && (
            <p className="text-muted text-center py-12">No items found.</p>
          )}
        </div>

        {/* Detail panel */}
        {selectedItemId && (
          <div className="fixed top-0 right-0 h-full w-80 glass-heavy border-l border-dungeon/40 overflow-y-auto z-40 p-5 space-y-4 animate-slide-in-right">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display text-gradient-coin font-semibold">Item Detail</h2>
              <button
                onClick={() => setSelectedItemId(null)}
                className="text-muted hover:text-body p-1.5 rounded-lg hover:bg-dungeon/30 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            {selectedItemDetail ? (
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-muted font-medium">Name</span>
                  <p className="text-body mt-1">
                    <ItemRarity name={selectedItemDetail.name} tier={selectedItemDetail.tier} />
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted font-medium">ID</span>
                  <p className="font-mono text-sm text-body mt-1 bg-void/40 px-3 py-1.5 rounded-lg">
                    {selectedItemDetail.id}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted font-medium">Tier</span>
                  <p className="mt-1">
                    <RarityBadge tier={selectedItemDetail.tier} />
                  </p>
                </div>
                {selectedItemDetail.category && (
                  <div>
                    <span className="text-xs text-muted font-medium">Category</span>
                    <p className="mt-1">
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md border border-muted/20 text-muted bg-muted/5">
                        {selectedItemDetail.category}
                      </span>
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted block mb-2 font-medium">
                    Raw Data
                  </span>
                  <JsonViewer data={selectedItemDetail} />
                </div>
              </div>
            ) : (
              <LoadingSkeleton />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
