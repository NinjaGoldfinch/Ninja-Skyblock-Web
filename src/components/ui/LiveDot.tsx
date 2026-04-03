interface LiveDotProps {
  active?: boolean
  className?: string
}

export function LiveDot({ active = true, className = '' }: LiveDotProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative flex h-2 w-2">
        {active && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-enchant opacity-35" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            active ? 'bg-enchant shadow-sm shadow-enchant/40' : 'bg-muted/40'
          }`}
        />
      </span>
      {active && <span className="text-[10px] text-enchant font-mono font-semibold tracking-[0.15em]">LIVE</span>}
    </span>
  )
}
