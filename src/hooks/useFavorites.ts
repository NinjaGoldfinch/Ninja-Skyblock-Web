import { useSyncExternalStore, useCallback } from 'react'

const STORAGE_KEY = 'ninja-bazaar-favorites'

let favorites: string[] = loadFavorites()
const listeners = new Set<() => void>()

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveFavorites(ids: string[]) {
  favorites = ids
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return favorites
}

export function useFavorites() {
  const favs = useSyncExternalStore(subscribe, getSnapshot)

  const toggle = useCallback((id: string) => {
    // Read directly from module variable to avoid stale closure
    const current = favorites
    const next = current.includes(id)
      ? current.filter((f) => f !== id)
      : [...current, id]
    saveFavorites(next)
  }, [])

  const isFavorite = useCallback((id: string) => favs.includes(id), [favs])

  const clearAll = useCallback(() => {
    saveFavorites([])
  }, [])

  return { favorites: favs, toggle, isFavorite, clearAll }
}
