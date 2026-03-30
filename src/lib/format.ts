import { getSettings } from './settings'

export function formatCoins(value: number): string {
  const settings = getSettings()
  if (settings.priceAbbreviated) {
    return abbreviateNumber(value)
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

export function abbreviateNumber(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

export function formatNumber(n: number, decimals = 0): string {
  if (n == null || isNaN(n)) return '--'
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

export function formatDate(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSec = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSec}s`
  const hours = Math.floor(minutes / 60)
  const remainingMin = minutes % 60
  return `${hours}h ${remainingMin}m`
}

export function formatPercent(n: number): string {
  return `${n.toFixed(2)}%`
}

export function truncateUuid(uuid: string): string {
  if (uuid.length <= 12) return uuid
  return `${uuid.slice(0, 6)}...${uuid.slice(-6)}`
}
