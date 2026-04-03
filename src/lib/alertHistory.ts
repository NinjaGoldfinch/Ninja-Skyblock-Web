export interface AlertHistoryEntry {
  id: string
  alertId: string
  itemId: string
  itemName: string
  field: 'instant_buy_price' | 'instant_sell_price'
  condition: 'above' | 'below'
  threshold: number
  actualValue: number
  triggeredAt: number
}

const STORAGE_KEY = 'ninja-alert-history'
const MAX_ENTRIES = 100

let cache: AlertHistoryEntry[] | null = null

export function getAlertHistory(): AlertHistoryEntry[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? JSON.parse(raw) : []
  } catch {
    cache = []
  }
  return cache!
}

export function addAlertHistoryEntry(
  entry: Omit<AlertHistoryEntry, 'id'>
): AlertHistoryEntry {
  const history = getAlertHistory()
  const newEntry: AlertHistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }
  cache = [newEntry, ...history].slice(0, MAX_ENTRIES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  return newEntry
}

export function getAlertHistoryForItem(itemId: string): AlertHistoryEntry[] {
  return getAlertHistory().filter((e) => e.itemId === itemId)
}

export function clearAlertHistory() {
  cache = []
  localStorage.removeItem(STORAGE_KEY)
}
