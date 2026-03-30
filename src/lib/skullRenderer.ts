/**
 * Extracts the head face (and optional hat overlay) from a Minecraft skin PNG.
 * Caches results as data URLs keyed by skin_url.
 */

const headCache = new Map<string, string>()
const pendingLoads = new Map<string, Promise<string>>()

/** Extract the 8x8 head face from a 64x64 skin texture, with hat overlay. */
function extractHead(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas')
  canvas.width = 8
  canvas.height = 8
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  // Draw face (8,8)-(16,16)
  ctx.drawImage(img, 8, 8, 8, 8, 0, 0, 8, 8)

  // Composite hat overlay (40,8)-(48,16) on top
  ctx.drawImage(img, 40, 8, 8, 8, 0, 0, 8, 8)

  return canvas.toDataURL()
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load skin: ${url}`))
    img.src = url
  })
}

/**
 * Get a data URL of the head face for a given skin_url.
 * Returns cached result if available, otherwise loads and extracts.
 */
export function getSkullHead(skinUrl: string): string | null {
  return headCache.get(skinUrl) ?? null
}

/**
 * Load and extract the head face, returning a data URL.
 * Deduplicates concurrent loads for the same URL.
 */
export async function loadSkullHead(skinUrl: string): Promise<string> {
  const cached = headCache.get(skinUrl)
  if (cached) return cached

  const pending = pendingLoads.get(skinUrl)
  if (pending) return pending

  const promise = loadImage(skinUrl)
    .then((img) => {
      const dataUrl = extractHead(img)
      headCache.set(skinUrl, dataUrl)
      pendingLoads.delete(skinUrl)
      return dataUrl
    })
    .catch((err) => {
      pendingLoads.delete(skinUrl)
      throw err
    })

  pendingLoads.set(skinUrl, promise)
  return promise
}
