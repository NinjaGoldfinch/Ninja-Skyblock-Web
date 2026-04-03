import { useState, useEffect, useRef } from 'react'
import { subscribeAuctionEvents } from '@/lib/auctionEventBus'
import { auctionSseClient } from '@/api/sse'

/**
 * Tracks auction SSE live update status.
 * Optionally filter to a specific skyblock_id, or pass undefined for all events.
 */
export function useAuctionSseLiveStatus(skyblockId?: string) {
  const [lastUpdate, setLastUpdate] = useState(0)
  const [updateCount, setUpdateCount] = useState(0)
  const [sseActive, setSseActive] = useState(() => auctionSseClient.state === 'connected')
  const tickRef = useRef(0)

  useEffect(() => {
    const unsub = auctionSseClient.onStateChange(() => {
      setSseActive(auctionSseClient.state === 'connected')
    })
    return () => { unsub() }
  }, [])

  useEffect(() => {
    const unsub = subscribeAuctionEvents((event) => {
      if (!skyblockId || event.skyblockId === skyblockId || event.itemId === skyblockId) {
        setLastUpdate(event.timestamp)
        setUpdateCount((c) => c + 1)
      }
    })
    return unsub
  }, [skyblockId])

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
