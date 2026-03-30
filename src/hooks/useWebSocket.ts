import { useState, useEffect, useCallback } from 'react'
import { wsManager } from '@/api/ws'
import type { WsEvent } from '@/types/api'

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

export function useWebSocket() {
  const [state, setState] = useState<ConnectionState>(wsManager.state)
  const [messages, setMessages] = useState<WsEvent[]>([])

  useEffect(() => {
    const unsub = wsManager.onStateChange(setState)
    return () => { unsub() }
  }, [])

  useEffect(() => {
    const unsub = wsManager.onMessage((event) => {
      setMessages(prev => {
        const next = [event, ...prev]
        return next.length > 200 ? next.slice(0, 200) : next
      })
    })
    return () => { unsub() }
  }, [])

  const connect = useCallback(() => wsManager.connect(), [])
  const disconnect = useCallback(() => wsManager.disconnect(), [])
  const subscribe = useCallback(
    (channel: string, filters?: Record<string, unknown>) => wsManager.subscribe(channel, filters),
    []
  )
  const unsubscribe = useCallback((channel: string) => wsManager.unsubscribe(channel), [])
  const clearMessages = useCallback(() => setMessages([]), [])

  return { state, messages, connect, disconnect, subscribe, unsubscribe, clearMessages }
}
