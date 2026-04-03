import { useEffect, useRef, createElement } from 'react'
import { toast } from 'sonner'
import { subscribeSseUpdates } from '@/lib/sseEventBus'
import { useItemNames } from '@/hooks/useItemNames'

const THROTTLE_MS = 5_000
const TOAST_DURATION = 6_000
const TOAST_ID = 'sse-bazaar-update'
const MAX_DISPLAY_ITEMS = 3

function isBazaarPage(): boolean {
  const path = window.location.pathname
  return path === '/bazaar' || path.startsWith('/bazaar/')
}

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

      // Only show bazaar toasts on bazaar pages
      if (!isBazaarPage()) return

      // On a specific item page, filter to that item
      let pageItemId: string | null = null
      const pathMatch = window.location.pathname.match(/^\/bazaar\/([^/]+)$/)
      if (pathMatch) {
        pageItemId = decodeURIComponent(pathMatch[1]!)
      }

      if (pageItemId) {
        if (!items.includes(pageItemId)) {
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
        createElement('div', { className: 'space-y-2' },
          createElement('div', { className: 'flex items-center gap-2' },
            createElement('span', {
              className: 'inline-flex h-5 w-5 items-center justify-center rounded-md bg-enchant/10 text-enchant',
            }, createElement('span', { className: 'text-[10px] font-bold' }, '\u2191')),
            createElement('span', { className: 'font-medium text-sm text-body-light' },
              `Bazaar updated \u00b7 ${items.length} item${items.length === 1 ? '' : 's'}`
            ),
          ),
          createElement('div', { className: 'flex flex-wrap gap-1.5' },
            ...displayItems.map((id) =>
              createElement('span', {
                key: id,
                className: 'inline-flex items-center px-2 py-0.5 rounded-md bg-coin/8 text-coin-light text-[11px] font-mono border border-coin/10 transition-colors',
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
