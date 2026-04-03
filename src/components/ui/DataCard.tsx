import type { ReactNode } from 'react'

interface DataCardProps {
  title?: string
  children: ReactNode
  className?: string
  glow?: boolean
}

export function DataCard({ title, children, className = '', glow }: DataCardProps) {
  return (
    <div
      className={`
        glass rounded-2xl border border-dungeon/30 p-5
        transition-all duration-300 relative overflow-hidden
        hover:border-dungeon/50
        ${glow
          ? 'border-glow-enchant hover:shadow-[0_0_30px_rgba(52,211,153,0.08)]'
          : 'hover:shadow-lg hover:shadow-black/15'
        }
        ${className}
      `}
    >
      {/* Subtle inner highlight at top edge */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      {title && (
        <h3 className="font-display text-gradient-coin text-sm uppercase tracking-[0.14em] mb-4 font-semibold">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
