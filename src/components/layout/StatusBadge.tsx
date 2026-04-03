import type { ApiMeta } from '@/types/api'

interface StatusBadgeProps {
  meta?: ApiMeta | null
  isRefetching?: boolean
  sseActive?: boolean
  sseAgo?: number
  sseItemAgo?: number
  nextUpdateIn?: number | null
  className?: string
}

function formatAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span className="relative flex h-1.5 w-1.5">
      {pulse && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-35`} />
      )}
      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${color} shadow-sm`} />
    </span>
  )
}

export function StatusBadge({ meta, isRefetching, sseActive, sseAgo, sseItemAgo, nextUpdateIn, className = '' }: StatusBadgeProps) {
  const countdownText = nextUpdateIn != null && nextUpdateIn > 0 ? ` · next ~${nextUpdateIn}s` : ''

  if (isRefetching) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border border-coin/15 text-coin bg-coin/5 ${className}`}>
        <Dot color="bg-coin" pulse />
        Refreshing...
      </span>
    )
  }

  if (sseActive && sseAgo != null && sseAgo >= 0) {
    const agoText = sseAgo > 0 ? formatAgo(sseAgo) : 'just now'
    let itemText = ''
    if (sseItemAgo != null && sseItemAgo >= 0 && sseItemAgo !== sseAgo) {
      itemText = ` (item: ${sseItemAgo > 0 ? formatAgo(sseItemAgo) : 'just now'})`
    }

    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border border-enchant/15 text-enchant bg-enchant/5 ${className}`}>
        <Dot color="bg-enchant" pulse />
        SSE Live · {agoText}
        {itemText && <span className="text-enchant/50">{itemText}</span>}
        {countdownText}
      </span>
    )
  }

  if (sseActive) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border border-enchant/15 text-enchant bg-enchant/5 ${className}`}>
        <Dot color="bg-enchant" pulse />
        SSE Connected{countdownText}
      </span>
    )
  }

  if (!meta) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border border-muted/15 text-muted/60 bg-muted/5 ${className}`}>
        No data
      </span>
    )
  }

  if (meta.cached) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border border-coin/15 text-coin bg-coin/5 ${className}`}>
        <Dot color="bg-coin" />
        Cached · {meta.cache_age_seconds}s ago{countdownText}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border border-enchant/15 text-enchant bg-enchant/5 ${className}`}>
      <Dot color="bg-enchant" pulse />
      Live{countdownText}
    </span>
  )
}
