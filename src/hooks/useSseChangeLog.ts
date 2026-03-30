import { useState, useEffect } from 'react'
import { subscribeSseUpdates } from '@/lib/sseEventBus'
import type { SseFieldChange } from '@/lib/sseEventBus'

export interface ChangeLogEntry {
  timestamp: number
  changes: SseFieldChange[]
}

const MAX_ENTRIES = 50

/**
 * Captures SSE field-level changes for a specific item into a rolling log.
 */
export function useSseChangeLog(itemId: string | undefined) {
  const [log, setLog] = useState<ChangeLogEntry[]>([])

  useEffect(() => {
    if (!itemId) return
    setLog([]) // reset on item change

    const unsub = subscribeSseUpdates((event) => {
      if (event.itemId !== itemId || event.changes.length === 0) return
      setLog((prev) => {
        const next = [{ timestamp: event.timestamp, changes: event.changes }, ...prev]
        return next.length > MAX_ENTRIES ? next.slice(0, MAX_ENTRIES) : next
      })
    })
    return unsub
  }, [itemId])

  return log
}
