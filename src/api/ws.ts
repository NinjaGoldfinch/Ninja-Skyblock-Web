import { getApiBaseUrl } from '@/lib/settings'
import type { WsEvent, WsMessage } from '@/types/api'

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
type MessageCallback = (event: WsEvent) => void
type StateCallback = (state: ConnectionState) => void

class WebSocketManager {
  private ws: WebSocket | null = null
  private messageCallbacks = new Set<MessageCallback>()
  private stateCallbacks = new Set<StateCallback>()
  private subscriptions = new Map<string, Record<string, unknown> | undefined>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000
  private _state: ConnectionState = 'disconnected'
  private _intentionalClose = false

  get state(): ConnectionState {
    return this._state
  }

  private setState(state: ConnectionState) {
    this._state = state
    this.stateCallbacks.forEach(cb => cb(state))
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this._intentionalClose = false
    const base = getApiBaseUrl().replace(/^http/, 'ws')
    const url = `${base}/v1/events/subscribe`

    this.setState('connecting')

    try {
      this.ws = new WebSocket(url)
    } catch {
      this.setState('disconnected')
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.setState('connected')
      this.reconnectDelay = 1000
      // Re-subscribe all active subscriptions
      for (const [channel, filters] of this.subscriptions) {
        this.sendSubscribe(channel, filters)
      }
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsEvent
        this.messageCallbacks.forEach(cb => cb(data))
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onclose = () => {
      if (this._intentionalClose) {
        this._intentionalClose = false
        return
      }
      this.setState('reconnecting')
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  disconnect() {
    this._intentionalClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
    this.setState('disconnected')
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
      this.connect()
    }, this.reconnectDelay)
  }

  private sendSubscribe(channel: string, filters?: Record<string, unknown>) {
    if (this.ws?.readyState !== WebSocket.OPEN) return
    const msg: WsMessage = { action: 'subscribe', channel, filters }
    this.ws.send(JSON.stringify(msg))
  }

  subscribe(channel: string, filters?: Record<string, unknown>) {
    this.subscriptions.set(channel, filters)
    this.sendSubscribe(channel, filters)
  }

  unsubscribe(channel: string) {
    this.subscriptions.delete(channel)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'unsubscribe', channel }))
    }
  }

  onMessage(cb: MessageCallback) {
    this.messageCallbacks.add(cb)
    return () => this.messageCallbacks.delete(cb)
  }

  onStateChange(cb: StateCallback) {
    this.stateCallbacks.add(cb)
    return () => this.stateCallbacks.delete(cb)
  }
}

export const wsManager = new WebSocketManager()
