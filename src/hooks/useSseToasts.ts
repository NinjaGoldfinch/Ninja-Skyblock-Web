import { useEffect, useRef, createElement } from 'react'
import { toast } from 'sonner'
import { subscribeSseUpdates } from '@/lib/sseEventBus'
import { useItemNames } from '@/hooks/useItemNames'

const THROTTLE_MS = 5_000
const TOAST_DURATION = 8_000
const TOAST_ID = 'sse-bazaar-update'
const MAX_DISPLAY_ITEMS = 6

export function useSseToasts() {
  const { getName } = useItemNames()
  const pendingItemsRef = useRef<Set<string>>(new Set())
  const lastToastRef = useRef(0)
  const timerRef = useRef(0)
  const getNameRef = useRef(getName)
  getNameRef.current = getName

  useEffect(() => {
    const flush = () => {
      let items = Array.from(pendingItemsRef.current)
      pendingItemsRef.current = new Set()
      timerRef.current = 0
      if (items.length === 0) return

      // On a specific item page, filter to that item
      // Matches /bazaar/ITEM_ID or /bazaar/chart?item=ITEM_ID
      let pageItemId: string | null = null
      const pathMatch = window.location.pathname.match(/^\/bazaar\/([^/]+)$/)
      if (pathMatch && pathMatch[1] !== 'chart') {
        pageItemId = decodeURIComponent(pathMatch[1]!)
      } else if (window.location.pathname === '/bazaar/chart') {
        const params = new URLSearchParams(window.location.search)
        pageItemId = params.get('item')
      }

      if (pageItemId) {
        if (!items.includes(pageItemId)) {
          // Other items updated but not the one we're viewing
          lastToastRef.current = Date.now()
          toast(
            createElement('div', { className: 'text-sm text-muted' },
              `Bazaar updated \u00b7 ${items.length} other item${items.length === 1 ? '' : 's'} \u00b7 no change for this item`
            ),
            {
              id: TOAST_ID,
              duration: 3_000,
            },
          )
          return
        }
        items = [pageItemId]
      }

      lastToastRef.current = Date.now()
      const gn = getNameRef.current

      const displayItems = items.slice(0, MAX_DISPLAY_ITEMS)
      const remaining = items.length - displayItems.length

      toast(
        createElement('div', { className: 'space-y-1.5' },
          createElement('div', { className: 'font-medium text-sm text-body' },
            `Bazaar updated \u00b7 ${items.length} item${items.length === 1 ? '' : 's'}`
          ),
          createElement('div', { className: 'flex flex-wrap gap-1.5' },
            ...displayItems.map((id) =>
              createElement('span', {
                key: id,
                className: 'inline-flex items-center px-2 py-0.5 rounded-md bg-coin/10 text-coin text-[11px] font-mono border border-coin/15',
              }, gn(id))
            ),
            remaining > 0
              ? createElement('span', {
                  key: '_more',
                  className: 'inline-flex items-center px-2 py-0.5 rounded-md bg-dungeon/30 text-muted text-[11px] font-mono',
                }, `+${remaining} more`)
              : null,
          ),
        ),
        {
          id: TOAST_ID,
          duration: TOAST_DURATION,
        },
      )
    }

    const unsub = subscribeSseUpdates((event) => {
      if (event.itemId === '__bazaar_listing__') return
      const itemId = event.itemId

      pendingItemsRef.current.add(itemId)

      if (!timerRef.current) {
        const sinceLast = Date.now() - lastToastRef.current
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
