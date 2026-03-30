interface LiveDotProps {
  active?: boolean
  className?: string
}

export function LiveDot({ active = true, className = '' }: LiveDotProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative flex h-2 w-2">
        {active && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            active ? 'bg-green-400 shadow-sm shadow-green-400/50' : 'bg-muted'
          }`}
        />
      </span>
      {active && <span className="text-[10px] text-green-400 font-mono font-semibold tracking-wider">LIVE</span>}
    </span>
  )
}
