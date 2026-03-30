import { rarityColor } from '@/lib/rarity'

interface ItemRarityProps {
  name: string
  tier?: string
  className?: string
}

export function ItemRarity({ name, tier, className = '' }: ItemRarityProps) {
  return (
    <span
      className={`font-semibold ${className}`}
      style={{ color: rarityColor(tier) }}
    >
      {name}
    </span>
  )
}

interface RarityBadgeProps {
  tier?: string
  className?: string
}

export function RarityBadge({ tier, className = '' }: RarityBadgeProps) {
  if (!tier) return null
  const color = rarityColor(tier)
  return (
    <span
      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md tracking-wider ${className}`}
      style={{
        color,
        borderColor: color + '30',
        backgroundColor: color + '12',
        border: `1px solid ${color}30`,
      }}
    >
      {tier}
    </span>
  )
}
