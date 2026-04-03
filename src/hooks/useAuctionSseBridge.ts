import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { auctionSseClient, type SseEvent } from '@/api/sse'
import { emitAuctionEvent, type AuctionSseEvent } from '@/lib/auctionEventBus'

/**
 * Connects the auction SSE stream to React Query cache.
 * - On `auction:lowest-bin-change`: patches the lowest BIN price in the listing cache
 * - On `auction:sold` / `auction:new-listing`: invalidates relevant caches
 * - On reconnect: invalidates all auction caches to catch missed updates
 * - All events are forwarded to the auction event bus for toasts/UI
 */
export function useAuctionSseBridge() {
  const queryClient = useQueryClient()
  const batchRef = useRef<SseEvent[]>([])
  const timerRef = useRef(0)

  useEffect(() => {
    auctionSseClient.connect()

    const flush = () => {
      const events = batchRef.current
      batchRef.current = []
      timerRef.current = 0

      for (const raw of events) {
        const type = raw.type as string
        const timestamp = (raw.timestamp as number) ?? Date.now()

        // Normalize the event into our bus format
        const itemId = (raw.skyblock_id ?? raw.item_id ?? raw.base_item ?? '') as string
        const itemName = (raw.base_item ?? raw.item_name ?? itemId) as string
        const price = (raw.price ?? raw.new_price ?? 0) as number

        const busEvent: AuctionSseEvent = {
          type: type as AuctionSseEvent['type'],
          itemId,
          itemName,
          skyblockId: (raw.skyblock_id as string) ?? undefined,
          price,
          timestamp,
          raw: raw as Record<string, unknown>,
        }

        emitAuctionEvent(busEvent)

        // Cache patching for lowest-bin-change
        if (type === 'auction:lowest-bin-change' && raw.skyblock_id) {
          const skyblockId = raw.skyblock_id as string
          const newPrice = raw.new_price as number

          // Patch the paginated listing cache
          queryClient.setQueriesData(
            { queryKey: ['lowestBins'], exact: false },
            (old: unknown) => {
              if (!old || typeof old !== 'object') return old
              const data = old as { data?: { items?: Array<{ skyblock_id: string; lowest_price: number }> } }
              if (!data.data?.items) return old
              return {
                ...data,
                data: {
                  ...data.data,
                  items: data.data.items.map((item) =>
                    item.skyblock_id === skyblockId
                      ? { ...item, lowest_price: newPrice }
                      : item
                  ),
                },
              }
            }
          )

          // Patch the item detail cache
          queryClient.setQueriesData(
            { queryKey: ['auction-item', skyblockId] },
            (old: unknown) => {
              if (!old || typeof old !== 'object') return old
              const data = old as { data?: { lowest?: { price: number } } }
              if (!data.data?.lowest) return old
              return {
                ...data,
                data: {
                  ...data.data,
                  lowest: { ...data.data.lowest, price: newPrice },
                },
              }
            }
          )
        }

        // Invalidate item detail on sold/new-listing (listings changed)
        if ((type === 'auction:sold' || type === 'auction:new-listing') && raw.skyblock_id) {
          queryClient.invalidateQueries({
            queryKey: ['auction-item', raw.skyblock_id as string],
            exact: true,
          })
        }
      }
    }

    const unsubEvent = auctionSseClient.onEvent((event) => {
      batchRef.current.push(event)
      if (!timerRef.current) {
        timerRef.current = window.setTimeout(flush, 150)
      }
    })

    // On reconnect, invalidate all auction caches
    const unsubState = auctionSseClient.onStateChange((state) => {
      if (state === 'connected' && batchRef.current.length === 0) {
        queryClient.invalidateQueries({ queryKey: ['lowestBins'], exact: false })
        queryClient.invalidateQueries({ queryKey: ['auction-item'], exact: false })
      }
    })

    return () => {
      unsubEvent()
      unsubState()
      if (timerRef.current) clearTimeout(timerRef.current)
      auctionSseClient.disconnect()
    }
  }, [queryClient])
}
