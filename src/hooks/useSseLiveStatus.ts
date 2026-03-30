import { useState, useEffect, useRef } from 'react'
import { subscribeSseUpdates } from '@/lib/sseEventBus'
import { sseClient } from '@/api/sse'

/**
 * Tracks SSE live update status for a specific item (or the listing with '__bazaar_listing__').
 * Returns whether SSE is active, the last update timestamp, and a count of updates since mount.
 */
export function useSseLiveStatus(busKey: string | undefined) {
  const [lastUpdate, setLastUpdate] = useState(0)
  const [updateCount, setUpdateCount] = useState(0)
  const [sseActive, setSseActive] = useState(() => sseClient.state === 'connected')
  const tickRef = useRef(0)

  // Track SSE connection state
  useEffect(() => {
    const unsub = sseClient.onStateChange(() => {
      setSseActive(sseClient.state === 'connected')
    })
    return () => { unsub() }
  }, [])

  // Subscribe to update events for this key
  useEffect(() => {
    if (!busKey) return

    const unsub = subscribeSseUpdates((event) => {
      if (event.itemId === busKey) {
        setLastUpdate(event.timestamp)
        setUpdateCount((c) => c + 1)
      }
    })
    return unsub
  }, [busKey])

  // Tick the "ago" display every second when there's a recent update
  const [ago, setAgo] = useState(0)
  useEffect(() => {
    if (!lastUpdate) { setAgo(0); return }

    const tick = () => setAgo(Math.floor((Date.now() - lastUpdate) / 1000))
    tick()
    tickRef.current = window.setInterval(tick, 1000)
    return () => clearInterval(tickRef.current)
  }, [lastUpdate])

  return { sseActive, lastSseUpdate: lastUpdate, sseAgo: ago, updateCount }
}
