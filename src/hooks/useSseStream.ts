import { useState, useEffect, useCallback, useRef } from 'react'
import { sseClient } from '@/api/sse'
import type { BazaarSseEvent } from '@/types/api'

export function useSseStream() {
  const [events, setEvents] = useState<BazaarSseEvent[]>([])
  const [connected, setConnected] = useState(sseClient.connected)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const unsub = sseClient.onEvent((event) => {
      if (!pausedRef.current) {
        setEvents(prev => {
          const next = [event, ...prev]
          return next.length > 200 ? next.slice(0, 200) : next
        })
      }
    })

    // Poll connected state
    const interval = setInterval(() => {
      setConnected(sseClient.connected)
    }, 1000)

    return () => {
      unsub()
      clearInterval(interval)
    }
  }, [])

  const connect = useCallback(() => {
    sseClient.connect()
    setConnected(true)
  }, [])

  const disconnect = useCallback(() => {
    sseClient.disconnect()
    setConnected(false)
  }, [])

  const togglePause = useCallback(() => setPaused(p => !p), [])
  const clearEvents = useCallback(() => setEvents([]), [])

  return { events, connected, paused, connect, disconnect, togglePause, clearEvents }
}
