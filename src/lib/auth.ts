import { getSettings } from './settings'

export function buildAuthHeaders(): Record<string, string> {
  const settings = getSettings()

  switch (settings.authMode) {
    case 'apikey':
      if (settings.apiKey) {
        return { 'X-API-Key': settings.apiKey }
      }
      return {}

    case 'hmac': {
      if (!settings.hmacSecret) return {}
      const timestamp = Math.floor(Date.now() / 1000).toString()
      // HMAC signing requires crypto.subtle — implemented async elsewhere
      // For now, return timestamp header; actual signing handled in client.ts
      return { 'X-Timestamp': timestamp }
    }

    case 'bypass':
    default:
      return {}
  }
}

export async function generateHmacSignature(
  secret: string,
  timestamp: string,
  body = ''
): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const data = encoder.encode(`${timestamp}${body}`)
  const signature = await crypto.subtle.sign('HMAC', key, data)
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
