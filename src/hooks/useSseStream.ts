import { useState, useEffect, useCallback, useRef } from 'react'
import { sseClient } from '@/api/sse'
import type { SseState, SseEvent } from '@/api/sse'

export type { SseEvent }

export function useSseStream() {
  const [events, setEvents] = useState<SseEvent[]>([])
  const [state, setState] = useState<SseState>(sseClient.state)
  const [lastError, setLastError] = useState<string | null>(sseClient.lastError)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const unsubEvent = sseClient.onEvent((event) => {
      if (!pausedRef.current) {
        setEvents(prev => {
          const next = [event, ...prev]
          return next.length > 200 ? next.slice(0, 200) : next
        })
      }
    })

    const unsubState = sseClient.onStateChange((newState) => {
      setState(newState)
      setLastError(sseClient.lastError)
    })

    return () => {
      unsubEvent()
      unsubState()
    }
  }, [])

  const connect = useCallback(() => {
    sseClient.connect()
  }, [])

  const disconnect = useCallback(() => {
    sseClient.disconnect()
  }, [])

  const togglePause = useCallback(() => setPaused(p => !p), [])
  const clearEvents = useCallback(() => setEvents([]), [])

  return { events, state, lastError, paused, connect, disconnect, togglePause, clearEvents }
}
