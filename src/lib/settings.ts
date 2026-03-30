import { type AppSettings, DEFAULT_SETTINGS } from '@/types/api'

const STORAGE_KEY = 'ninja-skyblock-settings'

export function getSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_SETTINGS }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const updated = { ...current, ...settings }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

export function getApiBaseUrl(): string {
  return getSettings().apiBaseUrl
}
