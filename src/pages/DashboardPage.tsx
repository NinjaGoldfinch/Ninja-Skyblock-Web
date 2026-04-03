import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, BarChart3, Gavel, Eye, Key, TrendingUp, TrendingDown } from "lucide-react";

import { DataCard } from "@/components/ui/DataCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { getHealth, getBazaar, getBazaarMovers, getLowestBins, getWatchedPlayers, getApiKeys } from "@/api/endpoints";
import { formatNumber } from "@/lib/format";
import type { BazaarMover } from "@/types/api";

function isUUID(input: string): boolean {
  const stripped = input.replace(/-/g, "");
  return /^[0-9a-fA-F]{32}$/.test(stripped);
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");

  const {
    data: healthResp,
    isLoading: healthLoading,
    isError: healthError,
    error: healthErrorData,
  } = useQuery({
    queryKey: ["health"],
    queryFn: () => getHealth(),
    refetchInterval: 30_000,
  });

  const health = healthResp?.data;

  const { data: bazaarResp } = useQuery({
    queryKey: ["bazaar-dashboard"],
    queryFn: () => getBazaar(),
    refetchInterval: 60_000,
  });

  const { data: binsResp } = useQuery({
    queryKey: ["lowest-bins-dashboard"],
    queryFn: () => getLowestBins(),
    refetchInterval: 60_000,
  });

  const { data: watchedResp } = useQuery({
    queryKey: ["watched-dashboard"],
    queryFn: () => getWatchedPlayers(),
    refetchInterval: 60_000,
    retry: false,
  });

  const { data: keysResp } = useQuery({
    queryKey: ["keys-dashboard"],
    queryFn: () => getApiKeys(),
    refetchInterval: 60_000,
    retry: false,
    enabled: false,
  });

  const [moverRange, setMoverRange] = useState<'1h' | '24h'>('1h');
  const { data: moversResp, isLoading: moversLoading } = useQuery({
    queryKey: ["bazaar-movers", moverRange],
    queryFn: () => getBazaarMovers(moverRange, 5),
    refetchInterval: 60_000,
  });

  const bazaarData = bazaarResp?.data as Record<string, unknown> | undefined;
  const bazaarCount = bazaarData
    ? (typeof bazaarData.count === 'number' ? bazaarData.count : Object.keys(bazaarData.products ?? bazaarData).length)
    : null;
  const binsData = binsResp?.data as Record<string, unknown> | undefined;
  const auctionCount = binsData
    ? (typeof binsData.count === 'number' ? binsData.count : (Array.isArray(binsData.items) ? binsData.items.length : null))
    : null;
  const watchedData = watchedResp?.data as Record<string, unknown> | undefined;
  const watchedCount = watchedData
    ? (typeof watchedData.count === 'number' ? watchedData.count : (Array.isArray(watchedData.players) ? watchedData.players.length : null))
    : null;
  const keysData = keysResp?.data;
  const keysCount = Array.isArray(keysData) ? keysData.length : null;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    if (isUUID(trimmed)) {
      navigate(`/player?id=${encodeURIComponent(trimmed)}`);
    } else {
      navigate(`/player?username=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      {/* Hero section */}
      <div className="mb-8">
        <h1 className="font-display text-gradient-coin text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted text-sm">Monitor your SkyBlock API at a glance</p>
      </div>

      {/* Quick Lookup Bar */}
      <form onSubmit={handleSearch} className="mb-8 flex gap-3 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search player by username or UUID..."
            className="w-full bg-nightstone/80 border border-dungeon/50 text-body font-mono pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:border-coin/50 transition-all placeholder:text-muted/50"
          />
        </div>
        <button
          type="submit"
          className="bg-gradient-to-r from-coin to-coin-light text-white font-semibold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-coin/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          Lookup
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        {/* Status Panel */}
        <DataCard title="API Status" className="lg:col-span-2">
          {healthLoading && <CardSkeleton />}
          {healthError && (
            <ErrorState error={healthErrorData instanceof Error ? healthErrorData : new Error("Failed to fetch health")} />
          )}
          {health && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(health.services ?? {}).map(([name, info]) => {
                const isHealthy = typeof info === 'boolean' ? info : (info as unknown as Record<string, unknown>)?.healthy === true;
                return (
                  <span
                    key={name}
                    className={`inline-flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                      isHealthy
                        ? "border-green-500/20 text-green-400 bg-green-500/5 hover:bg-green-500/10"
                        : "border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/10"
                    }`}
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      {isHealthy && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40" />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                          isHealthy ? "bg-green-400" : "bg-red-400"
                        }`}
                      />
                    </span>
                    {name}
                  </span>
                );
              })}
            </div>
          )}
        </DataCard>

        {/* Quick Stats */}
        <StatCard
          icon={Gavel}
          title="Unique Auction Items"
          value={auctionCount !== null ? formatNumber(auctionCount) : "--"}
          loading={auctionCount === null}
        />

        <StatCard
          icon={BarChart3}
          title="Bazaar Items"
          value={bazaarCount !== null ? formatNumber(bazaarCount) : "--"}
          loading={bazaarCount === null}
        />

        <StatCard
          icon={Eye}
          title="Watched Players"
          value={watchedCount !== null ? formatNumber(watchedCount) : "--"}
          loading={watchedCount === null}
        />

        <StatCard
          icon={Key}
          title="Active API Keys"
          value={keysCount !== null ? formatNumber(keysCount) : "--"}
          subtitle={keysCount === null ? "Not available" : undefined}
        />

        {/* Top Movers */}
        <DataCard className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-gradient-coin text-sm uppercase tracking-[0.12em] font-semibold">
              Top Movers
            </h3>
            <div className="flex items-center gap-1 border border-dungeon/40 rounded-lg p-0.5">
              {(['1h', '24h'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setMoverRange(r)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                    moverRange === r ? "bg-coin/10 text-coin" : "text-muted hover:text-body"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {moversLoading ? (
            <CardSkeleton />
          ) : (
            <TopMoversContent movers={moversResp?.data as unknown as { gainers?: BazaarMover[]; losers?: BazaarMover[] } | undefined} />
          )}
        </DataCard>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  loading,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  title: string;
  value: string;
  loading?: boolean;
  subtitle?: string;
}) {
  return (
    <DataCard>
      <div className="flex items-start justify-between mb-3">
        <span className="text-muted text-xs font-medium uppercase tracking-wider">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-coin/8 flex items-center justify-center">
          <Icon size={16} className="text-coin" />
        </div>
      </div>
      <p className="text-gradient-coin text-3xl font-display font-bold">
        {value}
      </p>
      {loading && !subtitle && <p className="text-muted/50 text-xs mt-1">Loading...</p>}
      {subtitle && <p className="text-muted/50 text-xs mt-1">{subtitle}</p>}
    </DataCard>
  );
}

function TopMoversContent({ movers }: { movers?: { gainers?: BazaarMover[]; losers?: BazaarMover[] } }) {
  const gainers = movers?.gainers ?? [];
  const losers = movers?.losers ?? [];

  if (gainers.length === 0 && losers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-6">
        <p className="text-muted text-sm">No mover data available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Gainers */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium uppercase tracking-wider mb-2">
          <TrendingUp size={12} />
          Gainers
        </div>
        {gainers.map((m) => (
          <MoverRow key={m.item_id} mover={m} type="gainer" />
        ))}
      </div>
      {/* Losers */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-damage font-medium uppercase tracking-wider mb-2">
          <TrendingDown size={12} />
          Losers
        </div>
        {losers.map((m) => (
          <MoverRow key={m.item_id} mover={m} type="loser" />
        ))}
      </div>
    </div>
  );
}

function MoverRow({ mover: m, type }: { mover: BazaarMover; type: "gainer" | "loser" }) {
  const color = type === "gainer" ? "text-green-400" : "text-damage";
  return (
    <Link
      to={`/bazaar/${m.item_id}`}
      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-coin/5 transition-colors group"
    >
      <ItemIcon itemId={m.item_id} size={24} />
      <span className="text-body-light text-sm font-medium flex-1 min-w-0 truncate group-hover:text-coin transition-colors">
        {m.display_name}
      </span>
      <div className="text-right shrink-0">
        <PriceDisplay amount={m.current_instant_buy} size="sm" />
        <p className={`text-xs font-mono font-medium ${color}`}>
          {m.change_percent >= 0 ? "+" : ""}{m.change_percent.toFixed(1)}%
        </p>
      </div>
    </Link>
  );
}
