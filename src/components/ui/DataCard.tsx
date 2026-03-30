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
        glass rounded-2xl border border-dungeon/40 p-5
        transition-all duration-300
        hover:border-dungeon/60
        ${glow
          ? 'border-glow-enchant hover:shadow-[0_0_24px_rgba(94,231,223,0.12)]'
          : 'hover:shadow-lg hover:shadow-black/20'
        }
        ${className}
      `}
    >
      {title && (
        <h3 className="font-display text-gradient-coin text-sm uppercase tracking-[0.12em] mb-4 font-semibold">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
