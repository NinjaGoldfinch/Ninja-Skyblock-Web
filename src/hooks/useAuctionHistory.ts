import { useQuery } from "@tanstack/react-query"
import { getAuctionHistory } from "@/api/endpoints"
import type { AuctionHistoryV2 } from "@/types/api"

type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d"

const STALE_TIME: Record<TimeRange, number> = {
  "1h": 10_000,
  "6h": 30_000,
  "24h": 60_000,
  "7d": 300_000,
  "30d": 600_000,
}

const REFETCH_INTERVAL: Record<TimeRange, number | false> = {
  "1h": 10_000,
  "6h": 30_000,
  "24h": false,
  "7d": false,
  "30d": false,
}

export function useAuctionHistory(item: string | undefined, range: TimeRange) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["auction-history", item, range],
    queryFn: async () => {
      const resp = await getAuctionHistory(item!, range)
      return resp.data as unknown as AuctionHistoryV2
    },
    enabled: !!item,
    staleTime: STALE_TIME[range],
    refetchInterval: REFETCH_INTERVAL[range],
  })

  return {
    history: data,
    datapoints: data?.datapoints ?? [],
    summary: data?.summary,
    resolution: data?.resolution,
    sparse: data?.sparse ?? false,
    loading: isLoading,
    error: isError ? error : null,
  }
}
