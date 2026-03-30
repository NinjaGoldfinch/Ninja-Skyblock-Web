import { getApiBaseUrl } from '@/lib/settings'

export type SseEvent = Record<string, unknown> & { timestamp?: number; type?: string }
type EventCallback = (event: SseEvent) => void
type StateCallback = (state: SseState) => void

export type SseState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'

class SseClient {
  private source: EventSource | null = null
  private eventCallbacks = new Set<EventCallback>()
  private stateCallbacks = new Set<StateCallback>()
  private _state: SseState = 'disconnected'
  private _lastError: string | null = null
  private _intentionalClose = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private readonly maxReconnectDelay = 30000

  get state(): SseState {
    return this._state
  }

  get lastError(): string | null {
    return this._lastError
  }

  private setState(state: SseState, error?: string) {
    this._state = state
    this._lastError = error ?? null
    this.stateCallbacks.forEach(cb => cb(state))
  }

  connect() {
    if (this.source) return
    this._intentionalClose = false

    const base = getApiBaseUrl()
    const url = `${base}/v1/events/bazaar/stream`

    this.setState('connecting')

    this.source = new EventSource(url)

    this.source.onopen = () => {
      this.reconnectDelay = 1000 // reset backoff on successful connect
      this.setState('connected')
    }

    this.source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SseEvent
        this.eventCallbacks.forEach(cb => cb(data))
      } catch {
        // ignore malformed events
      }
    }

    this.source.onerror = () => {
      if (this._intentionalClose) return

      if (this.source?.readyState === EventSource.CLOSED) {
        // Fully closed — clean up and schedule reconnect
        this.source = null
        this.setState('reconnecting', 'Connection lost — reconnecting...')
        this.scheduleReconnect()
      } else {
        // Browser is auto-reconnecting (readyState CONNECTING)
        this.setState('connecting')
      }
    }
  }

  disconnect() {
    this._intentionalClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.source?.close()
    this.source = null
    this.reconnectDelay = 1000
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

  onEvent(cb: EventCallback) {
    this.eventCallbacks.add(cb)
    return () => this.eventCallbacks.delete(cb)
  }

  onStateChange(cb: StateCallback) {
    this.stateCallbacks.add(cb)
    return () => this.stateCallbacks.delete(cb)
  }
}

export const sseClient = new SseClient()
