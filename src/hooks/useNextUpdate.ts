import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Returns a countdown (in seconds) until the query becomes stale and will be refetched.
 * Returns null if the query doesn't exist or has no stale time configured.
 */
export function useNextUpdate(queryKey: readonly unknown[], staleTimeMs?: number) {
  const queryClient = useQueryClient()
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    const effectiveStaleTime = staleTimeMs ?? (queryClient.getDefaultOptions().queries?.staleTime as number | undefined) ?? 30_000

    const tick = () => {
      const state = queryClient.getQueryState(queryKey)
      if (!state?.dataUpdatedAt) { setCountdown(null); return }

      const elapsed = Date.now() - state.dataUpdatedAt
      const remaining = Math.max(0, Math.ceil((effectiveStaleTime - elapsed) / 1000))
      setCountdown(remaining)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [queryClient, queryKey, staleTimeMs]) // eslint-disable-line react-hooks/exhaustive-deps

  return countdown
}
