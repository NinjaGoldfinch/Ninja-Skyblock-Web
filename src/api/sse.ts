import { getApiBaseUrl } from '@/lib/settings'
import type { BazaarSseEvent } from '@/types/api'

type EventCallback = (event: BazaarSseEvent) => void

class SseClient {
  private source: EventSource | null = null
  private callbacks = new Set<EventCallback>()
  private _connected = false

  get connected(): boolean {
    return this._connected
  }

  connect() {
    if (this.source) return

    const base = getApiBaseUrl()
    const url = `${base}/v1/events/bazaar/stream`

    this.source = new EventSource(url)

    this.source.onopen = () => {
      this._connected = true
    }

    this.source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as BazaarSseEvent
        this.callbacks.forEach(cb => cb(data))
      } catch {
        // ignore malformed events
      }
    }

    this.source.onerror = () => {
      this._connected = false
      // EventSource auto-reconnects
    }
  }

  disconnect() {
    this.source?.close()
    this.source = null
    this._connected = false
  }

  onEvent(cb: EventCallback) {
    this.callbacks.add(cb)
    return () => this.callbacks.delete(cb)
  }
}

export const sseClient = new SseClient()
