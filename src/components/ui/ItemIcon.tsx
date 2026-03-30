import {
  Sword,
  Shield,
  HardHat,
  Shirt,
  Footprints,
  Pickaxe,
  Axe,
  Fish,
  Wand2,
  Gem,
  FlaskRound,
  Scroll,
  Wheat,
  Egg,
  Blocks,
  BookOpen,
  Sparkles,
  Package,
  type LucideIcon,
} from 'lucide-react'
import { rarityColor } from '@/lib/rarity'

/** Maps item categories to representative icons */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  SWORD: Sword,
  BOW: Wand2,
  HELMET: HardHat,
  CHESTPLATE: Shirt,
  LEGGINGS: Shirt,
  BOOTS: Footprints,
  PICKAXE: Pickaxe,
  AXE: Axe,
  FISHING_ROD: Fish,
  FISHING_WEAPON: Fish,
  WAND: Wand2,
  ACCESSORY: Gem,
  NECKLACE: Gem,
  CLOAK: Sparkles,
  BELT: Sparkles,
  GLOVES: Sparkles,
  BRACELET: Gem,
  HATCESSORY: HardHat,
  COSMETIC: Sparkles,
  DEPLOYABLE: Package,
  DRILL: Pickaxe,
  SHEARS: Axe,
  HOE: Wheat,
  PET_ITEM: Egg,
  REFORGE_STONE: Gem,
  TRAVEL_SCROLL: Scroll,
  DUNGEON_ITEM: Shield,
  ARROW_POISON: FlaskRound,
  POTION: FlaskRound,
}

/** Guess an icon from the item ID if category is missing */
function guessIconFromId(itemId: string): LucideIcon {
  const id = itemId.toUpperCase()
  if (id.includes('ENCHANTMENT') || id.includes('ENCHANTED')) return BookOpen
  if (id.includes('POTION') || id.includes('FLASK') || id.includes('BREW')) return FlaskRound
  if (id.includes('SCROLL')) return Scroll
  if (id.includes('SWORD') || id.includes('BLADE')) return Sword
  if (id.includes('HELMET') || id.includes('HAT') || id.includes('CROWN')) return HardHat
  if (id.includes('CHESTPLATE') || id.includes('TUNIC')) return Shirt
  if (id.includes('LEGGING')) return Shirt
  if (id.includes('BOOTS')) return Footprints
  if (id.includes('PICKAXE') || id.includes('DRILL')) return Pickaxe
  if (id.includes('AXE')) return Axe
  if (id.includes('BOW') || id.includes('WAND') || id.includes('STAFF')) return Wand2
  if (id.includes('ROD')) return Fish
  if (id.includes('WHEAT') || id.includes('SEED') || id.includes('CROP') || id.includes('CANE') || id.includes('PUMPKIN') || id.includes('MELON') || id.includes('POTATO') || id.includes('CARROT') || id.includes('CACTUS') || id.includes('MUSHROOM') || id.includes('COCOA') || id.includes('NETHER_WART')) return Wheat
  if (id.includes('GEM') || id.includes('CRYSTAL') || id.includes('JASPER') || id.includes('RUBY') || id.includes('SAPPHIRE') || id.includes('AMBER') || id.includes('AMETHYST') || id.includes('OPAL') || id.includes('JADE') || id.includes('TOPAZ')) return Gem
  if (id.includes('LOG') || id.includes('WOOD') || id.includes('PLANK')) return Axe
  if (id.includes('ORE') || id.includes('COBBLE') || id.includes('STONE') || id.includes('OBSIDIAN') || id.includes('SAND') || id.includes('GRAVEL') || id.includes('CLAY') || id.includes('IRON') || id.includes('GOLD') || id.includes('DIAMOND') || id.includes('EMERALD') || id.includes('COAL') || id.includes('LAPIS') || id.includes('REDSTONE') || id.includes('QUARTZ') || id.includes('MITHRIL') || id.includes('TITANIUM')) return Blocks
  if (id.includes('EGG') || id.includes('PET')) return Egg
  if (id.includes('TALISMAN') || id.includes('RING') || id.includes('ARTIFACT') || id.includes('RELIC')) return Gem
  return Package
}

interface ItemIconProps {
  /** Item ID for fallback icon guessing */
  itemId?: string
  /** Item category from the API */
  category?: string
  /** Item tier/rarity for color */
  tier?: string
  /** Size in pixels */
  size?: number
  /** Optional texture URL — for future use when API provides textures */
  textureUrl?: string
  className?: string
}

export function ItemIcon({
  itemId,
  category,
  tier,
  size = 32,
  textureUrl,
  className = '',
}: ItemIconProps) {
  const color = rarityColor(tier)
  const iconSize = Math.round(size * 0.5)

  // Future: render actual texture when available
  if (textureUrl) {
    return (
      <div
        className={`shrink-0 rounded-xl overflow-hidden ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={textureUrl}
          alt=""
          width={size}
          height={size}
          className="w-full h-full object-contain"
          style={{ imageRendering: 'pixelated' }}
          loading="lazy"
        />
      </div>
    )
  }

  const Icon = (category && CATEGORY_ICONS[category.toUpperCase()])
    || (itemId ? guessIconFromId(itemId) : Package)

  return (
    <div
      className={`shrink-0 rounded-xl flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color + '12',
        border: `1px solid ${color}25`,
      }}
    >
      <Icon size={iconSize} style={{ color }} strokeWidth={1.8} />
    </div>
  )
}
