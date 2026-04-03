export const CATEGORIES = [
  'Enchantments',
  'Mining',
  'Farming',
  'Foraging',
  'Fishing',
  'Combat',
  'Gemstones',
  'Essences',
  'Materials',
] as const

export type Category = (typeof CATEGORIES)[number]

const RULES: [RegExp, Category][] = [
  [/^ENCHANTMENT_/, 'Enchantments'],
  [/^ESSENCE_|_ESSENCE$/, 'Essences'],
  [/_GEM(STONE)?$|^PERFECT_|^FLAWED_|^FINE_|^FLAWLESS_|^ROUGH_.*GEM/, 'Gemstones'],
  [/ORE$|_INGOT$|^COBBLESTONE$|^DIAMOND$|^EMERALD$|^IRON_|^GOLD_|^COAL$|^LAPIS_|^REDSTONE|^QUARTZ$|^OBSIDIAN$|^GLOWSTONE|^MITHRIL|^TITANIUM|^HARD_STONE|SULPHUR|TREASURITE/, 'Mining'],
  [/WHEAT|SEED|CARROT|POTATO|PUMPKIN|MELON|CACTUS|SUGAR_CANE|MUSHROOM|COCOA|NETHER_STALK|CROP|COMPOST|FERMENTO|PESTAL/, 'Farming'],
  [/LOG$|LOG_|^WOOD|SAPLING|LEAVES|ACACIA|BIRCH|SPRUCE|JUNGLE|DARK_OAK/, 'Foraging'],
  [/RAW_FISH|FISH|PRISMARINE|SPONGE|INK_SACK|LILY_PAD|WATER_LILY|SHARK|SQUID/, 'Fishing'],
  [/ROTTEN_FLESH|BONE|SPIDER_EYE|ENDER_PEARL|BLAZE|GHAST|MAGMA|SLIME|STRING|GUNPOWDER|SULPHUR$|ARROW|REVENANT|TARANTULA|VOIDGLOOM/, 'Combat'],
  [/^ENCHANTED_/, 'Materials'],
]

export function getCategory(itemId: string): Category | null {
  for (const [pattern, category] of RULES) {
    if (pattern.test(itemId)) return category
  }
  return null
}
