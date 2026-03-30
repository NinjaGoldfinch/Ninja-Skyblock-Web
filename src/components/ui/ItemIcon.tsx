import { useState, useEffect, memo } from 'react'
import {
  Sword, Shield, HardHat, Shirt, Footprints, Pickaxe, Axe, Fish, Wand2,
  Gem, FlaskRound, Scroll, Wheat, Egg, Blocks, BookOpen, Sparkles, Package,
  type LucideIcon,
} from 'lucide-react'
import { rarityColor } from '@/lib/rarity'
import { useTexture } from '@/hooks/useTextureMap'
import { getSkullHead, loadSkullHead } from '@/lib/skullRenderer'
import type { TextureData } from '@/types/api'

// --- Lucide fallback icons (used when no texture data available) ---

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  SWORD: Sword, BOW: Wand2, HELMET: HardHat, CHESTPLATE: Shirt,
  LEGGINGS: Shirt, BOOTS: Footprints, PICKAXE: Pickaxe, AXE: Axe,
  FISHING_ROD: Fish, FISHING_WEAPON: Fish, WAND: Wand2, ACCESSORY: Gem,
  NECKLACE: Gem, CLOAK: Sparkles, BELT: Sparkles, GLOVES: Sparkles,
  BRACELET: Gem, HATCESSORY: HardHat, COSMETIC: Sparkles, DEPLOYABLE: Package,
  DRILL: Pickaxe, SHEARS: Axe, HOE: Wheat, PET_ITEM: Egg,
  REFORGE_STONE: Gem, TRAVEL_SCROLL: Scroll, DUNGEON_ITEM: Shield,
  ARROW_POISON: FlaskRound, POTION: FlaskRound,
}

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
  if (id.includes('WHEAT') || id.includes('SEED') || id.includes('CROP')) return Wheat
  if (id.includes('ORE') || id.includes('COBBLE') || id.includes('STONE') || id.includes('DIAMOND') || id.includes('EMERALD') || id.includes('IRON') || id.includes('GOLD') || id.includes('COAL') || id.includes('LAPIS') || id.includes('REDSTONE')) return Blocks
  if (id.includes('EGG') || id.includes('PET')) return Egg
  if (id.includes('TALISMAN') || id.includes('RING') || id.includes('ARTIFACT') || id.includes('RELIC')) return Gem
  return Package
}

// --- Sprite path resolution ---

/** Resolve a vanilla material name to a sprite path in /assets/items/ */
function spritePath(material: string, durability?: number): string {
  const base = material.toLowerCase()
  if (durability != null && durability > 0) {
    return `/assets/items/${base}_${durability}.png`
  }
  return `/assets/items/${base}.png`
}

/** Resolve item_model to a sprite path */
function modelSpritePath(itemModel: string): string {
  // Strip "minecraft:" prefix if present
  const key = itemModel.replace(/^minecraft:/, '')
  return `/assets/items/${key}.png`
}

// --- Sub-renderers ---

const SkullIcon = memo(function SkullIcon({ skinUrl, size }: { skinUrl: string; size: number }) {
  const [src, setSrc] = useState<string | null>(() => getSkullHead(skinUrl))

  useEffect(() => {
    if (src) return
    let cancelled = false
    loadSkullHead(skinUrl).then((dataUrl) => {
      if (!cancelled) setSrc(dataUrl)
    }).catch(() => {
      // Skin load failed — leave as null, fallback will show
    })
    return () => { cancelled = true }
  }, [skinUrl, src])

  if (!src) {
    return <div className="item-icon item-icon--placeholder" style={{ width: size, height: size }} />
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="item-icon"
      loading="lazy"
    />
  )
})

function SpriteIcon({ path, size, glowing, onError }: { path: string; size: number; glowing?: boolean; onError: () => void }) {
  return (
    <img
      src={path}
      alt=""
      width={size}
      height={size}
      className={`item-icon ${glowing ? 'item-icon--glowing' : ''}`}
      loading="lazy"
      onError={onError}
    />
  )
}

// --- Main component ---

interface ItemIconProps {
  itemId?: string
  category?: string
  tier?: string
  size?: number
  className?: string
}

export const ItemIcon = memo(function ItemIcon({
  itemId,
  category,
  tier,
  size = 32,
  className = '',
}: ItemIconProps) {
  const texture = useTexture(itemId)
  const [spriteFailed, setSpriteFailed] = useState(false)

  // Reset failure state when texture/itemId changes
  useEffect(() => { setSpriteFailed(false) }, [itemId, texture])

  const useFallback = !texture || spriteFailed
  const rendered = useFallback ? null : renderTexture(texture, size, () => setSpriteFailed(true))

  if (rendered) {
    return (
      <div
        className={`item-icon-container shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        {rendered}
      </div>
    )
  }

  return <FallbackIcon itemId={itemId} category={category} tier={tier} size={size} className={className} />
})

function renderTexture(texture: TextureData, size: number, onSpriteError: () => void): React.ReactNode {
  switch (texture.type) {
    case 'skull': {
      if (!texture.skin_url) return null
      return <SkullIcon skinUrl={texture.skin_url} size={size} />
    }
    case 'vanilla': {
      const path = spritePath(texture.material, texture.durability)
      return <SpriteIcon path={path} size={size} glowing={texture.glowing} onError={onSpriteError} />
    }
    case 'item_model': {
      const path = modelSpritePath(texture.item_model)
      return <SpriteIcon path={path} size={size} onError={onSpriteError} />
    }
    case 'leather': {
      const path = spritePath(texture.material)
      return <SpriteIcon path={path} size={size} onError={onSpriteError} />
    }
    default:
      return null
  }
}

function FallbackIcon({ itemId, category, tier, size, className }: ItemIconProps & { size: number }) {
  const color = rarityColor(tier)
  const iconSize = Math.round(size * 0.5)
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
