import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { sseClient } from '@/api/sse'
import { getSettings } from '@/lib/settings'
import {
  patchBazaarListing,
  patchBazaarV2Listing,
  patchBazaarItem,
  appendHistoryFromEvent,
  extendAllActiveHistories,
} from '@/lib/sseCacheUpdaters'
import type { LastPointMap } from '@/lib/sseCacheUpdaters'
import { emitSseUpdate } from '@/lib/sseEventBus'
import type { SseFieldChange } from '@/lib/sseEventBus'
import type { SseEvent } from '@/api/sse'
import type { BazaarSseEvent } from '@/types/api'

/**
 * Convert a bazaar:price_change event (old_X/new_X pairs) into individual
 * BazaarSseEvent field updates that the listing/item cache updaters understand.
 */
function toFieldEvents(event: SseEvent): BazaarSseEvent[] {
  const itemId = event.item_id as string | undefined
  const timestamp = (event.timestamp as number) ?? Date.now()
  if (!itemId) return []

  const results: BazaarSseEvent[] = []
  for (const key of Object.keys(event)) {
    if (!key.startsWith('new_')) continue
    const field = key.slice(4)
    const oldKey = `old_${field}`
    if (!(oldKey in event)) continue

    const newVal = event[key]
    const oldVal = event[oldKey]
    if (typeof newVal !== 'number' && typeof newVal !== 'string') continue

    results.push({
      item_id: itemId,
      field,
      old_value: oldVal as number | string,
      new_value: newVal as number | string,
      timestamp,
    })
  }
  return results
}

function isBazaarPriceEvent(event: SseEvent): boolean {
  return typeof event.item_id === 'string' && typeof event.type === 'string' && event.type.startsWith('bazaar:')
}

export function useSseCacheBridge() {
  const queryClient = useQueryClient()
  const lastPointMapRef = useRef<LastPointMap>(new Map())
  const pendingRef = useRef<SseEvent[]>([])
  const flushTimerRef = useRef<number>(0)

  useEffect(() => {
    // Always connect SSE so status indicators and event bus work
    if (sseClient.state === 'disconnected' || sseClient.state === 'error') {
      sseClient.connect()
    }

    // Invalidate stale caches when SSE reconnects after a disconnect
    let wasDisconnected = sseClient.state !== 'connected'
    const unsubState = sseClient.onStateChange((state) => {
      if (state === 'connected' && wasDisconnected) {
        // Refetch all bazaar data that may have gone stale during disconnect
        queryClient.invalidateQueries({ queryKey: ['bazaar'] })
        queryClient.invalidateQueries({ queryKey: ['bazaar-item'] })
        queryClient.invalidateQueries({ queryKey: ['bazaar-history-v2'] })
      }
      wasDisconnected = state !== 'connected'
    })

    const flush = () => {
      const batch = pendingRef.current
      pendingRef.current = []
      if (!batch.length) return

      const mode = getSettings().liveDataMode
      const itemChanges = new Map<string, SseFieldChange[]>()

      for (const event of batch) {
        if (!isBazaarPriceEvent(event)) continue
        const itemId = event.item_id as string

        // Extract field changes for the event bus
        const fieldEvents = toFieldEvents(event)
        const changes: SseFieldChange[] = fieldEvents.map((fe) => ({
          field: fe.field,
          oldValue: typeof fe.old_value === 'number' ? fe.old_value : Number(fe.old_value),
          newValue: typeof fe.new_value === 'number' ? fe.new_value : Number(fe.new_value),
        })).filter((c) => !isNaN(c.oldValue) && !isNaN(c.newValue))

        // Merge changes if same item appears multiple times in batch
        const existing = itemChanges.get(itemId)
        itemChanges.set(itemId, existing ? [...existing, ...changes] : changes)

        if (mode === 'off') continue

        // Patch listing + item caches
        for (const fe of fieldEvents) {
          patchBazaarListing(queryClient, fe)
          patchBazaarV2Listing(queryClient, fe)
          patchBazaarItem(queryClient, fe)
        }

        // Append a history datapoint from SSE data (both full and extrapolated modes)
        const ts = (event.timestamp as number) ?? Date.now()
        appendHistoryFromEvent(queryClient, itemId, ts, event as Record<string, unknown>, lastPointMapRef.current)
      }

      // Carry-forward active history queries that weren't directly updated
      if (mode !== 'off' && itemChanges.size > 0) {
        const updatedItemIds = new Set(itemChanges.keys())
        extendAllActiveHistories(queryClient, lastPointMapRef.current, updatedItemIds)
      }

      // Notify listeners (always, regardless of mode)
      const now = Date.now()
      if (itemChanges.size > 0) {
        emitSseUpdate('__bazaar_listing__', now)
      }
      for (const [id, changes] of itemChanges) {
        emitSseUpdate(id, now, changes)
      }
    }

    const unsubEvent = sseClient.onEvent((event: SseEvent) => {
      pendingRef.current.push(event)
      if (!flushTimerRef.current) {
        flushTimerRef.current = window.setTimeout(() => {
          flushTimerRef.current = 0
          flush()
        }, 100)
      }
    })

    return () => {
      unsubState()
      unsubEvent()
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current)
        flushTimerRef.current = 0
      }
      pendingRef.current = []
    }
  }, [queryClient])
}
