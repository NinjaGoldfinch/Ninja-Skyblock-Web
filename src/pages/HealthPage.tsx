import { useQuery } from "@tanstack/react-query";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { getHealth } from "@/api/endpoints";
import { DataCard } from "@/components/ui/DataCard";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import type { HealthResponse, ServiceStatus } from "@/types/api";

const WORKER_KEYS = ["bazaar", "auctions", "profiles", "resources"];

function formatLatency(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function formatLastCheck(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

export default function HealthPage() {
  const {
    data: resp,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["health"],
    queryFn: () => getHealth(),
    refetchInterval: 15_000,
  });

  const data: HealthResponse | undefined = resp?.data;
  const meta = resp?.meta;

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="mx-auto max-w-5xl space-y-6">
          <h1 className="font-display text-4xl text-gradient-coin font-bold">Service Health</h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="animate-fade-in">
        <div className="mx-auto max-w-5xl space-y-6">
          <h1 className="font-display text-4xl text-gradient-coin font-bold">Service Health</h1>
          <ErrorState
            error={error instanceof Error ? error : new Error("Failed to fetch health data")}
          />
        </div>
      </div>
    );
  }

  const services = data?.services ?? {};
  const coreServices = Object.entries(services).filter(
    ([key]) => !WORKER_KEYS.includes(key)
  );
  const workers = Object.entries(services).filter(([key]) =>
    WORKER_KEYS.includes(key)
  );

  return (
    <div className="animate-fade-in">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl text-gradient-coin font-bold">Service Health</h1>
            <StatusBadge meta={meta} isRefetching={isFetching} />
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 glass border border-dungeon/40 px-5 py-2.5 rounded-xl text-body hover:border-coin/30 hover:text-coin transition-all disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={isFetching ? "animate-spin" : ""}
            />
            Refresh now
          </button>
        </div>

        {/* Core Services */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {coreServices.map(([name, service]) => (
            <ServiceCard key={name} name={name} service={service} />
          ))}
        </div>

        {/* Workers */}
        {workers.length > 0 && (
          <>
            <h2 className="font-display text-xl text-gradient-coin pt-2 font-semibold">Workers</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {workers.map(([name, service]) => (
                <ServiceCard key={name} name={name} service={service} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ServiceCard({
  name,
  service,
}: {
  name: string;
  service: boolean | ServiceStatus;
}) {
  const isHealthy = typeof service === 'boolean' ? service : service.healthy;
  const latency = typeof service === 'object' ? service.latency : undefined;
  const lastCheck = typeof service === 'object' ? service.lastCheck : undefined;

  return (
    <DataCard className={isHealthy ? "hover:border-green-500/20" : "hover:border-red-500/20"}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm capitalize text-body font-medium">
            {name}
          </span>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isHealthy ? "bg-green-500/10" : "bg-red-500/10"
          }`}>
            {isHealthy ? (
              <CheckCircle size={18} className="text-green-400" />
            ) : (
              <XCircle size={18} className="text-red-400" />
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-muted">
          {latency !== undefined && (
            <p>
              Latency:{" "}
              <span className="font-mono text-body">
                {formatLatency(latency)}
              </span>
            </p>
          )}
          {lastCheck !== undefined && (
            <p>
              Last check:{" "}
              <span className="font-mono text-body">
                {formatLastCheck(lastCheck)}
              </span>
            </p>
          )}
        </div>
      </div>
    </DataCard>
  );
}
