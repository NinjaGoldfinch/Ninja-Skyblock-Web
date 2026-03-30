import type { QueryClient } from '@tanstack/react-query'
import type { ApiResponse, BazaarProductRaw, BazaarSseEvent, BazaarHistoryV2, BazaarHistoryDatapoint } from '@/types/api'

// --- Bazaar listing cache (BazaarPage) ---

interface BazaarListingData {
  products: Record<string, BazaarProductRaw>
  [key: string]: unknown
}

// V1 bazaar uses Hypixel's inverted naming:
//   sell_summary = sell orders = what user pays to instant-buy
//   buy_summary  = buy orders = what user gets to instant-sell
// SSE fields use user perspective, so we cross-map:
const LISTING_FIELD_MAP: Record<string, (product: BazaarProductRaw, value: number) => void> = {
  instant_buy_price: (p, v) => {
    if (p.sell_summary?.[0]) p.sell_summary[0].pricePerUnit = v  // cheapest sell order = instant buy
  },
  instant_sell_price: (p, v) => {
    if (p.buy_summary?.[0]) p.buy_summary[0].pricePerUnit = v   // highest buy order = instant sell
  },
  buy_volume: (p, v) => {
    if (p.sell_summary?.[0]) p.sell_summary[0].amount = v
  },
  sell_volume: (p, v) => {
    if (p.buy_summary?.[0]) p.buy_summary[0].amount = v
  },
}

export function patchBazaarListing(queryClient: QueryClient, event: BazaarSseEvent) {
  if (!event.item_id || !event.field) return
  const numVal = typeof event.new_value === 'number' ? event.new_value : Number(event.new_value)
  if (isNaN(numVal)) return

  const patcher = LISTING_FIELD_MAP[event.field]
  if (!patcher) return

  queryClient.setQueryData<ApiResponse<BazaarListingData>>(
    ['bazaar'],
    (old) => {
      if (!old?.data?.products) return old
      const product = old.data.products[event.item_id]
      if (!product) return old

      // Shallow-clone path to trigger react-query change detection
      const newProduct = {
        ...product,
        sell_summary: [...(product.sell_summary ?? [])],
        buy_summary: [...(product.buy_summary ?? [])],
      }
      // Clone the first entry if it exists
      if (newProduct.sell_summary[0]) newProduct.sell_summary[0] = { ...newProduct.sell_summary[0] }
      if (newProduct.buy_summary[0]) newProduct.buy_summary[0] = { ...newProduct.buy_summary[0] }

      patcher(newProduct, numVal)

      return {
        ...old,
        data: {
          ...old.data,
          products: { ...old.data.products, [event.item_id]: newProduct },
        },
      }
    },
  )
}

// --- Bazaar item cache (BazaarItemPage) ---

export function patchBazaarItem(queryClient: QueryClient, event: BazaarSseEvent) {
  if (!event.item_id || !event.field) return
  const numVal = typeof event.new_value === 'number' ? event.new_value : Number(event.new_value)
  if (isNaN(numVal)) return

  queryClient.setQueryData<ApiResponse<Record<string, unknown>>>(
    ['bazaar-item', event.item_id],
    (old) => {
      if (!old?.data) return old

      const newData = { ...old.data, [event.field]: numVal }

      // Patch top order entries — V2 API uses Hypixel naming (inverted):
      //   instant_buy_price = cheapest sell order → top_sell_orders[0]
      //   instant_sell_price = highest buy order → top_buy_orders[0]
      if (event.field === 'instant_buy_price') {
        const orders = (newData.top_sell_orders as { price_per_unit: number }[] | undefined)
        if (orders?.[0]) {
          newData.top_sell_orders = [{ ...orders[0], price_per_unit: numVal }, ...orders.slice(1)]
        }
      } else if (event.field === 'instant_sell_price') {
        const orders = (newData.top_buy_orders as { price_per_unit: number }[] | undefined)
        if (orders?.[0]) {
          newData.top_buy_orders = [{ ...orders[0], price_per_unit: numVal }, ...orders.slice(1)]
        }
      }

      return { ...old, data: newData }
    },
  )
}

// --- History cache (extrapolated mode) ---

// Max range durations for trimming old points
const RANGE_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

export type LastPointMap = Map<string, { timestamp: number; datapoint: BazaarHistoryDatapoint }>

/** Ensure timestamp is strictly after the last datapoint (by at least 1ms) */
function ensureAscTime(ts: number, datapoints: BazaarHistoryDatapoint[]): number {
  if (!datapoints.length) return ts
  const lastTs = datapoints[datapoints.length - 1]!.timestamp
  return ts > lastTs ? ts : lastTs + 1
}

export function appendHistoryDatapoint(
  queryClient: QueryClient,
  event: BazaarSseEvent,
  lastPointMap: LastPointMap,
) {
  if (!event.item_id || !event.field) return
  const numVal = typeof event.new_value === 'number' ? event.new_value : Number(event.new_value)
  if (isNaN(numVal)) return

  const queries = queryClient.getQueriesData<BazaarHistoryV2>({
    queryKey: ['bazaar-history-v2', event.item_id],
  })

  for (const [queryKey, old] of queries) {
    if (!old?.datapoints?.length) continue

    const lastPoint = old.datapoints[old.datapoints.length - 1]
    if (!lastPoint) continue

    const range = queryKey[2] as string
    const maxAge = RANGE_MS[range] ?? 24 * 60 * 60 * 1000
    const cutoff = Date.now() - maxAge
    const trimmed = old.datapoints.filter((d) => d.timestamp >= cutoff)

    const safeTs = ensureAscTime(event.timestamp, trimmed)
    const newPoint: BazaarHistoryDatapoint = {
      timestamp: safeTs,
      instant_buy_price: lastPoint.instant_buy_price,
      instant_sell_price: lastPoint.instant_sell_price,
      avg_buy_price: lastPoint.avg_buy_price,
      avg_sell_price: lastPoint.avg_sell_price,
      buy_volume: lastPoint.buy_volume,
      sell_volume: lastPoint.sell_volume,
    }
    if (event.field in newPoint) {
      (newPoint as unknown as Record<string, number>)[event.field] = numVal
    }

    queryClient.setQueryData<BazaarHistoryV2>(queryKey, {
      ...old,
      datapoints: [...trimmed, newPoint],
      count: trimmed.length + 1,
    })

    lastPointMap.set(event.item_id, { timestamp: safeTs, datapoint: newPoint })
  }
}

/**
 * Append a history datapoint from a raw bazaar:price_change SSE event,
 * applying all new_ fields at once (instead of one field at a time).
 */
export function appendHistoryFromEvent(
  queryClient: QueryClient,
  itemId: string,
  timestamp: number,
  event: Record<string, unknown>,
  lastPointMap: LastPointMap,
) {
  const queries = queryClient.getQueriesData<BazaarHistoryV2>({
    queryKey: ['bazaar-history-v2', itemId],
  })

  for (const [queryKey, old] of queries) {
    if (!old?.datapoints?.length) continue

    const lastPoint = old.datapoints[old.datapoints.length - 1]
    if (!lastPoint) continue

    const range = queryKey[2] as string
    const maxAge = RANGE_MS[range] ?? 24 * 60 * 60 * 1000
    const cutoff = Date.now() - maxAge
    const trimmed = old.datapoints.filter((d) => d.timestamp >= cutoff)

    const safeTs = ensureAscTime(timestamp, trimmed)
    const newPoint: BazaarHistoryDatapoint = {
      timestamp: safeTs,
      instant_buy_price: (event.new_instant_buy_price as number) ?? lastPoint.instant_buy_price,
      instant_sell_price: (event.new_instant_sell_price as number) ?? lastPoint.instant_sell_price,
      avg_buy_price: (event.new_avg_buy_price as number) ?? lastPoint.avg_buy_price,
      avg_sell_price: (event.new_avg_sell_price as number) ?? lastPoint.avg_sell_price,
      buy_volume: (event.new_buy_volume as number) ?? lastPoint.buy_volume,
      sell_volume: (event.new_sell_volume as number) ?? lastPoint.sell_volume,
    }

    queryClient.setQueryData<BazaarHistoryV2>(queryKey, {
      ...old,
      datapoints: [...trimmed, newPoint],
      count: trimmed.length + 1,
    })

    lastPointMap.set(itemId, { timestamp: safeTs, datapoint: newPoint })
  }
}

/**
 * Extend all active bazaar-history-v2 queries with a carry-forward datapoint
 * at the current timestamp, duplicating the last known values.
 * This keeps chart lines extending to "now" even when no SSE events arrive.
 */
/**
 * Extend active history queries that were NOT already updated in this flush.
 * Carry-forwards the last known point to "now" so chart lines keep extending.
 */
export function extendAllActiveHistories(
  queryClient: QueryClient,
  lastPointMap: LastPointMap,
  skipItems?: Set<string>,
) {
  const now = Date.now()

  const allHistoryQueries = queryClient.getQueriesData<BazaarHistoryV2>({
    queryKey: ['bazaar-history-v2'],
  })

  for (const [queryKey, old] of allHistoryQueries) {
    if (!old?.datapoints?.length) continue
    const itemId = queryKey[1] as string
    if (skipItems?.has(itemId)) continue // already got a real datapoint this flush

    // Use lastPointMap entry if available (has latest SSE values), otherwise last datapoint
    const source = lastPointMap.get(itemId)?.datapoint
      ?? old.datapoints[old.datapoints.length - 1]
    if (!source) continue

    extendHistoryQueries(queryClient, itemId, now, source)
  }
}

function extendHistoryQueries(
  queryClient: QueryClient,
  itemId: string,
  now: number,
  sourcePoint: BazaarHistoryDatapoint,
) {
  const queries = queryClient.getQueriesData<BazaarHistoryV2>({
    queryKey: ['bazaar-history-v2', itemId],
  })

  for (const [queryKey, old] of queries) {
    if (!old?.datapoints?.length) continue

    const range = queryKey[2] as string
    const maxAge = RANGE_MS[range] ?? 24 * 60 * 60 * 1000
    const cutoff = now - maxAge
    const trimmed = old.datapoints.filter((d) => d.timestamp >= cutoff)

    const safeTs = ensureAscTime(now, trimmed)
    const filledPoint: BazaarHistoryDatapoint = { ...sourcePoint, timestamp: safeTs }

    queryClient.setQueryData<BazaarHistoryV2>(queryKey, {
      ...old,
      datapoints: [...trimmed, filledPoint],
      count: trimmed.length + 1,
    })
  }
}
