interface SkeletonProps {
  className?: string
  lines?: number
}

export function LoadingSkeleton({ className = '', lines = 1 }: SkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="h-4 animate-shimmer rounded-lg"
          style={{
            width: i === lines - 1 && lines > 1 ? '60%' : '100%',
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </div>
  )
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`glass rounded-2xl border border-dungeon/25 p-5 space-y-3 relative overflow-hidden ${className}`}>
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
      <div className="h-4 w-24 animate-shimmer rounded-lg" />
      <div className="h-7 w-32 animate-shimmer rounded-lg" style={{ animationDelay: '80ms' }} />
      <div className="h-3 w-full animate-shimmer rounded-lg" style={{ animationDelay: '160ms' }} />
      <div className="h-3 w-3/4 animate-shimmer rounded-lg" style={{ animationDelay: '240ms' }} />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="h-4 w-32 animate-shimmer rounded-lg" />
          <div className="h-4 w-24 animate-shimmer rounded-lg" />
          <div className="h-4 w-20 animate-shimmer rounded-lg" />
        </div>
      ))}
    </div>
  )
}
