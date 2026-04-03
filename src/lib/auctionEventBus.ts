export interface AuctionSseEvent {
  type: 'auction:sold' | 'auction:new-listing' | 'auction:lowest-bin-change' | 'auction:new_lowest_bin' | 'auction:ending_soon'
  itemId: string
  itemName: string
  skyblockId?: string
  price: number
  timestamp: number
  raw: Record<string, unknown>
}

type Listener = (event: AuctionSseEvent) => void

const listeners = new Set<Listener>()

export function emitAuctionEvent(event: AuctionSseEvent) {
  for (const cb of listeners) cb(event)
}

export function subscribeAuctionEvents(cb: Listener) {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
