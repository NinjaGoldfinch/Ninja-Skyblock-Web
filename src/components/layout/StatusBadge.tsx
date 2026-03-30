import type { ApiMeta } from '@/types/api'

interface StatusBadgeProps {
  meta?: ApiMeta | null
  isRefetching?: boolean
  sseActive?: boolean
  sseAgo?: number           // seconds since last SSE update for the stream
  sseItemAgo?: number       // seconds since last SSE update for this specific item
  nextUpdateIn?: number | null
  className?: string
}

function formatAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

export function StatusBadge({ meta, isRefetching, sseActive, sseAgo, sseItemAgo, nextUpdateIn, className = '' }: StatusBadgeProps) {
  const countdownText = nextUpdateIn != null && nextUpdateIn > 0 ? ` · next ~${nextUpdateIn}s` : ''

  if (isRefetching) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-coin/20 text-coin bg-coin/5 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-coin animate-pulse-glow" />
        Refreshing...
      </span>
    )
  }

  if (sseActive && sseAgo != null && sseAgo >= 0) {
    // Build the SSE status text
    let agoText = ''
    if (sseAgo > 0) {
      agoText = formatAgo(sseAgo)
    } else {
      agoText = 'just now'
    }

    // Item-specific timing (shown in brackets if different from stream timing)
    let itemText = ''
    if (sseItemAgo != null && sseItemAgo >= 0 && sseItemAgo !== sseAgo) {
      itemText = ` (item: ${sseItemAgo > 0 ? formatAgo(sseItemAgo) : 'just now'})`
    }

    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-green-500/20 text-green-400 bg-green-500/5 ${className}`}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
        </span>
        SSE Live · {agoText}
        {itemText && <span className="text-green-400/60">{itemText}</span>}
        {countdownText}
      </span>
    )
  }

  if (sseActive) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-green-500/20 text-green-400 bg-green-500/5 ${className}`}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
        </span>
        SSE Connected{countdownText}
      </span>
    )
  }

  if (!meta) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-muted/20 text-muted bg-muted/5 ${className}`}>
        No data
      </span>
    )
  }

  if (meta.cached) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-enchant/20 text-enchant bg-enchant/5 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-enchant" />
        Cached · {meta.cache_age_seconds}s ago{countdownText}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-green-500/20 text-green-400 bg-green-500/5 ${className}`}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
      </span>
      Live{countdownText}
    </span>
  )
}
