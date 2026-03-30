import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getItemTextures } from '@/api/endpoints'
import type { TextureMap, TextureData } from '@/types/api'

const STORAGE_KEY = 'ninja-texture-map'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

interface CachedTextures {
  map: TextureMap
  timestamp: number
}

interface TextureMapState {
  textureMap: TextureMap
  loading: boolean
  error: Error | null
}

const TextureContext = createContext<TextureMapState>({
  textureMap: {},
  loading: true,
  error: null,
})

function loadFromCache(): TextureMap | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const cached: CachedTextures = JSON.parse(raw)
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.map
    }
  } catch { /* ignore corrupt cache */ }
  return null
}

function saveToCache(map: TextureMap) {
  try {
    const cached: CachedTextures = { map, timestamp: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
  } catch { /* storage full — non-critical */ }
}

export function TextureProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TextureMapState>(() => {
    const cached = loadFromCache()
    return {
      textureMap: cached ?? {},
      loading: !cached,
      error: null,
    }
  })

  useEffect(() => {
    let cancelled = false

    async function fetchTextures() {
      try {
        const resp = await getItemTextures()
        const map = resp.data as unknown as TextureMap
        if (!cancelled) {
          saveToCache(map)
          setState({ textureMap: map, loading: false, error: null })
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err : new Error('Failed to fetch textures'),
          }))
        }
      }
    }

    fetchTextures()
    // Refresh periodically
    const interval = setInterval(fetchTextures, CACHE_TTL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <TextureContext.Provider value={state}>
      {children}
    </TextureContext.Provider>
  )
}

export function useTextureMap() {
  return useContext(TextureContext)
}

export function useTexture(itemId: string | undefined): TextureData | undefined {
  const { textureMap } = useContext(TextureContext)
  return itemId ? textureMap[itemId] : undefined
}
