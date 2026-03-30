export interface SseFieldChange {
  field: string
  oldValue: number
  newValue: number
}

export interface SseUpdateEvent {
  itemId: string
  timestamp: number
  changes: SseFieldChange[]
}

type Listener = (event: SseUpdateEvent) => void

const listeners = new Set<Listener>()

export function emitSseUpdate(itemId: string, timestamp: number, changes?: SseFieldChange[]) {
  const event: SseUpdateEvent = { itemId, timestamp, changes: changes ?? [] }
  for (const cb of listeners) cb(event)
}

export function subscribeSseUpdates(cb: Listener) {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
