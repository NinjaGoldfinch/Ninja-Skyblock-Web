/**
 * Tints a leather armor sprite with an RGB color using canvas compositing.
 * Caches results keyed by material+color.
 */

const tintCache = new Map<string, string>()

/**
 * Tint a base sprite image with an [R, G, B] color.
 * Uses canvas multiply blend to colorize the grayscale base.
 */
export function tintLeatherSprite(
  baseImg: HTMLImageElement,
  color: [number, number, number],
): string {
  const key = `${baseImg.src}:${color.join(',')}`
  const cached = tintCache.get(key)
  if (cached) return cached

  const w = baseImg.naturalWidth
  const h = baseImg.naturalHeight

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  // 1. Draw base sprite
  ctx.drawImage(baseImg, 0, 0)

  // 2. Multiply blend with the target color
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
  ctx.fillRect(0, 0, w, h)

  // 3. Restore original transparency
  ctx.globalCompositeOperation = 'destination-atop'
  ctx.drawImage(baseImg, 0, 0)

  const dataUrl = canvas.toDataURL()
  tintCache.set(key, dataUrl)
  return dataUrl
}
