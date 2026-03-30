import type { ApiMeta } from '@/types/api'

interface StatusBadgeProps {
  meta?: ApiMeta | null
  isRefetching?: boolean
  className?: string
}

export function StatusBadge({ meta, isRefetching, className = '' }: StatusBadgeProps) {
  if (isRefetching) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-coin/20 text-coin bg-coin/5 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-coin animate-pulse-glow" />
        Refreshing...
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
        Cached · {meta.cache_age_seconds}s ago
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-green-500/20 text-green-400 bg-green-500/5 ${className}`}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
      </span>
      Live
    </span>
  )
}
