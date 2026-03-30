/**
 * Resolves a Minecraft skin URL to a 3D head render URL via mc-heads.net.
 *
 * Skin URLs look like: http://textures.minecraft.net/texture/{hash}
 * mc-heads.net accepts the hash directly: https://mc-heads.net/head/{hash}
 */

/** Extract the texture hash from a textures.minecraft.net URL */
export function extractTextureHash(skinUrl: string): string | null {
  // Match the hash at the end of the URL path
  const match = skinUrl.match(/\/texture\/([a-f0-9]+)$/i)
  return match?.[1] ?? null
}

/** Get a 3D isometric head render URL for a given skin URL */
export function getSkullHeadUrl(skinUrl: string): string | null {
  const hash = extractTextureHash(skinUrl)
  if (!hash) return null
  return `https://mc-heads.net/head/${hash}`
}
