export const RARITY_COLORS = {
  COMMON: '#aaaaaa',
  UNCOMMON: '#55ff55',
  RARE: '#5555ff',
  EPIC: '#aa00aa',
  LEGENDARY: '#ffaa00',
  MYTHIC: '#ff55ff',
  SPECIAL: '#ff5555',
  VERY_SPECIAL: '#ff5555',
} as const

export type Rarity = keyof typeof RARITY_COLORS

export function rarityColor(tier: string | undefined | null): string {
  if (!tier) return '#aaaaaa'
  return RARITY_COLORS[tier.toUpperCase() as Rarity] ?? '#aaaaaa'
}

export function rarityOrder(tier: string): number {
  const order: Record<string, number> = {
    COMMON: 0,
    UNCOMMON: 1,
    RARE: 2,
    EPIC: 3,
    LEGENDARY: 4,
    MYTHIC: 5,
    SPECIAL: 6,
    VERY_SPECIAL: 7,
  }
  return order[tier.toUpperCase()] ?? -1
}
