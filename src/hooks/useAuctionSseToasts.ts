import { useEffect, useRef, createElement } from 'react'
import { toast } from 'sonner'
import { subscribeAuctionEvents, type AuctionSseEvent } from '@/lib/auctionEventBus'

const THROTTLE_MS = 5_000
const TOAST_DURATION = 6_000
const MAX_DISPLAY = 3

// Toast IDs per event type so they replace each other
const TOAST_IDS = {
  sold: 'sse-auction-sold',
  listing: 'sse-auction-listing',
  price: 'sse-auction-price',
} as const

function isAuctionPage(): boolean {
  return window.location.pathname.startsWith('/auctions')
}

export function useAuctionSseToasts() {
  const soldRef = useRef<AuctionSseEvent[]>([])
  const listingRef = useRef<AuctionSseEvent[]>([])
  const priceRef = useRef<AuctionSseEvent[]>([])
  const lastFlushRef = useRef(0)
  const timerRef = useRef(0)

  useEffect(() => {
    const flush = () => {
      timerRef.current = 0
      lastFlushRef.current = Date.now()

      if (!isAuctionPage()) {
        // Clear batches silently when not on auction page
        soldRef.current = []
        listingRef.current = []
        priceRef.current = []
        return
      }

      // Sold items toast
      if (soldRef.current.length > 0) {
        const events = soldRef.current
        soldRef.current = []
        showGroupToast(
          TOAST_IDS.sold,
          `${events.length} auction${events.length === 1 ? '' : 's'} sold`,
          events,
          'text-enchant',
        )
      }

      // New listings toast
      if (listingRef.current.length > 0) {
        const events = listingRef.current
        listingRef.current = []
        showGroupToast(
          TOAST_IDS.listing,
          `${events.length} new listing${events.length === 1 ? '' : 's'}`,
          events,
          'text-coin-light',
        )
      }

      // Price changes toast
      if (priceRef.current.length > 0) {
        const events = priceRef.current
        priceRef.current = []
        showGroupToast(
          TOAST_IDS.price,
          `${events.length} price change${events.length === 1 ? '' : 's'}`,
          events,
          'text-gold',
        )
      }
    }

    const unsub = subscribeAuctionEvents((event) => {
      if (event.type === 'auction:sold') {
        soldRef.current.push(event)
      } else if (event.type === 'auction:new-listing') {
        listingRef.current.push(event)
      } else if (event.type === 'auction:lowest-bin-change' || event.type === 'auction:new_lowest_bin') {
        priceRef.current.push(event)
      }
      // ending_soon: no toast — not actionable enough

      if (!timerRef.current) {
        const sinceLast = Date.now() - lastFlushRef.current
        const delay = Math.max(0, THROTTLE_MS - sinceLast)
        timerRef.current = window.setTimeout(flush, delay)
      }
    })

    return () => {
      unsub()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])
}

function showGroupToast(
  id: string,
  title: string,
  events: AuctionSseEvent[],
  colorClass: string,
) {
  const display = events.slice(0, MAX_DISPLAY)
  const remaining = events.length - display.length

  // Deduplicate by item name
  const seen = new Set<string>()
  const unique = display.filter((e) => {
    const key = e.itemName || e.itemId
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  toast(
    createElement('div', { className: 'space-y-2' },
      createElement('div', { className: `font-medium text-sm ${colorClass}` }, title),
      createElement('div', { className: 'flex flex-wrap gap-1.5' },
        ...unique.map((e) =>
          createElement('span', {
            key: e.raw.auction_id as string ?? e.itemId,
            className: 'inline-flex items-center px-2 py-0.5 rounded-md bg-coin/8 text-coin-light text-[11px] font-mono border border-coin/10',
          }, e.itemName || e.itemId)
        ),
        remaining > 0
          ? createElement('span', {
              key: '_more',
              className: 'inline-flex items-center px-2 py-0.5 rounded-md bg-dungeon/30 text-muted text-[11px] font-mono',
            }, `+${remaining} more`)
          : null,
      ),
    ),
    { id, duration: TOAST_DURATION },
  )
}
