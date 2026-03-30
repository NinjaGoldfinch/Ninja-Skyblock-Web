import { useState, useCallback } from 'react'
import { getSettings, saveSettings } from '@/lib/settings'

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState(() => getSettings().apiKey)

  const setApiKey = useCallback((key: string) => {
    saveSettings({ apiKey: key })
    setApiKeyState(key)
  }, [])

  const clearApiKey = useCallback(() => {
    saveSettings({ apiKey: '' })
    setApiKeyState('')
  }, [])

  return { apiKey, setApiKey, clearApiKey }
}
