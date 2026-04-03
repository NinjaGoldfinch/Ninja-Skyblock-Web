import { useEffect, useRef, useSyncExternalStore } from 'react'
import { subscribeSseUpdates, type SseUpdateEvent } from '@/lib/sseEventBus'

type Direction = 'up' | 'down' | null

const DECAY_MS = 30_000 // direction resets after 30s of no updates

interface DirectionEntry {
  direction: Direction
  expiresAt: number
}

const directionMap = new Map<string, DirectionEntry>()
const listeners = new Set<() => void>()
let version = 0

function notify() {
  version++
  listeners.forEach((l) => l())
}

function getSnapshot() {
  return version
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function handleEvent(event: SseUpdateEvent) {
  const priceChange = event.changes.find(
    (c) => c.field === 'instant_buy_price' || c.field === 'instant_sell_price'
  )
  if (!priceChange) return

  const direction: Direction = priceChange.newValue > priceChange.oldValue ? 'up' : 'down'
  directionMap.set(event.itemId, {
    direction,
    expiresAt: Date.now() + DECAY_MS,
  })
  notify()
}

// Cleanup expired entries periodically
let cleanupInterval: ReturnType<typeof setInterval> | null = null

function startCleanup() {
  if (cleanupInterval) return
  cleanupInterval = setInterval(() => {
    const now = Date.now()
    let changed = false
    for (const [key, entry] of directionMap) {
      if (entry.expiresAt <= now) {
        directionMap.delete(key)
        changed = true
      }
    }
    if (changed) notify()
    if (directionMap.size === 0 && cleanupInterval) {
      clearInterval(cleanupInterval)
      cleanupInterval = null
    }
  }, 5000)
}

export function usePriceDirection(): (itemId: string) => Direction {
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    unsubRef.current = subscribeSseUpdates(handleEvent)
    startCleanup()
    return () => {
      unsubRef.current?.()
    }
  }, [])

  // Subscribe to version changes so component re-renders on direction updates
  useSyncExternalStore(subscribe, getSnapshot)

  return (itemId: string) => {
    const entry = directionMap.get(itemId)
    if (!entry) return null
    if (entry.expiresAt <= Date.now()) return null
    return entry.direction
  }
}
