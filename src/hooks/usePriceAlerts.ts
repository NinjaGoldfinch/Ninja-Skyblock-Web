import { useEffect, useRef, useSyncExternalStore, useCallback } from 'react'
import { subscribeSseUpdates, type SseUpdateEvent } from '@/lib/sseEventBus'
import { addAlertHistoryEntry } from '@/lib/alertHistory'
import { toast } from 'sonner'

// --- Types ---

export interface PriceAlert {
  id: string
  itemId: string
  itemName: string
  field: 'instant_buy_price' | 'instant_sell_price'
  condition: 'above' | 'below'
  threshold: number
  enabled: boolean
  createdAt: number
  lastTriggeredAt?: number
}

// --- Storage ---

const STORAGE_KEY = 'ninja-price-alerts'
const COOLDOWN_MS = 5 * 60_000 // 5 minutes

let alerts: PriceAlert[] = loadAlerts()
const listeners = new Set<() => void>()
let version = 0

function loadAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
  version++
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return version
}

// --- Alert management ---

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function addAlert(alert: Omit<PriceAlert, 'id' | 'createdAt' | 'enabled'>): PriceAlert {
  const newAlert: PriceAlert = {
    ...alert,
    id: generateId(),
    createdAt: Date.now(),
    enabled: true,
  }
  alerts = [...alerts, newAlert]
  persist()

  // Request notification permission on first alert
  if (alerts.length === 1 && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }

  return newAlert
}

export function removeAlert(id: string) {
  alerts = alerts.filter((a) => a.id !== id)
  persist()
}

export function toggleAlert(id: string) {
  alerts = alerts.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a)
  persist()
}

export function getAlertsForItem(itemId: string): PriceAlert[] {
  return alerts.filter((a) => a.itemId === itemId)
}

// --- SSE listener ---

function checkAlerts(event: SseUpdateEvent) {
  const now = Date.now()

  for (const change of event.changes) {
    const field = change.field as PriceAlert['field']
    if (field !== 'instant_buy_price' && field !== 'instant_sell_price') continue

    const matching = alerts.filter(
      (a) => a.enabled && a.itemId === event.itemId && a.field === field
    )

    for (const alert of matching) {
      // Cooldown check
      if (alert.lastTriggeredAt && now - alert.lastTriggeredAt < COOLDOWN_MS) continue

      const triggered =
        (alert.condition === 'above' && change.newValue >= alert.threshold) ||
        (alert.condition === 'below' && change.newValue <= alert.threshold)

      if (!triggered) continue

      // Update last triggered
      alerts = alerts.map((a) =>
        a.id === alert.id ? { ...a, lastTriggeredAt: now } : a
      )
      persist()

      // Persist to alert history
      addAlertHistoryEntry({
        alertId: alert.id,
        itemId: event.itemId,
        itemName: alert.itemName,
        field: alert.field,
        condition: alert.condition,
        threshold: alert.threshold,
        actualValue: change.newValue,
        triggeredAt: now,
      })

      const fieldLabel = field === 'instant_buy_price' ? 'Buy price' : 'Sell price'
      const condLabel = alert.condition === 'above' ? 'above' : 'below'
      const message = `${alert.itemName}: ${fieldLabel} is now ${condLabel} ${alert.threshold.toLocaleString()} (${change.newValue.toLocaleString()})`

      // Toast notification
      toast.info(message, { duration: 8000 })

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Price Alert', { body: message, icon: '/favicon.ico' })
      }
    }
  }
}

// --- Hook ---

export function usePriceAlerts() {
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    unsubRef.current = subscribeSseUpdates(checkAlerts)
    return () => { unsubRef.current?.() }
  }, [])

  // Subscribe to version changes for reactivity
  useSyncExternalStore(subscribe, getSnapshot)

  const add = useCallback((alert: Omit<PriceAlert, 'id' | 'createdAt' | 'enabled'>) => {
    return addAlert(alert)
  }, [])

  const remove = useCallback((id: string) => removeAlert(id), [])
  const toggle = useCallback((id: string) => toggleAlert(id), [])

  const forItem = useCallback((itemId: string) => {
    return alerts.filter((a) => a.itemId === itemId)
  }, [/* version drives re-render via useSyncExternalStore */]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    alerts,
    add,
    remove,
    toggle,
    forItem,
  }
}
