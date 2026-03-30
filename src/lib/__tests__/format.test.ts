import { describe, it, expect, vi } from 'vitest'
import { calcSpread, abbreviateNumber, formatNumber, formatDate, formatDuration, formatPercent, truncateUuid } from '../format'

// Mock settings to control priceAbbreviated flag
vi.mock('../settings', () => ({
  getSettings: () => ({ priceAbbreviated: true }),
}))

describe('calcSpread', () => {
  it('returns positive spread when sell > buy', () => {
    const result = calcSpread(100, 120)
    expect(result.spread).toBe(20)
    expect(result.spreadPercent).toBeCloseTo(20)
  })

  it('returns negative spread when sell < buy', () => {
    const result = calcSpread(100, 80)
    expect(result.spread).toBe(-20)
    expect(result.spreadPercent).toBeCloseTo(-20)
  })

  it('returns zero when prices are equal', () => {
    const result = calcSpread(100, 100)
    expect(result.spread).toBe(0)
    expect(result.spreadPercent).toBe(0)
  })

  it('handles zero buy price', () => {
    const result = calcSpread(0, 100)
    expect(result.spread).toBe(100)
    expect(result.spreadPercent).toBe(0)
  })
})

describe('abbreviateNumber', () => {
  it('abbreviates billions', () => {
    expect(abbreviateNumber(1_500_000_000)).toBe('1.50B')
  })

  it('abbreviates millions', () => {
    expect(abbreviateNumber(2_500_000)).toBe('2.50M')
  })

  it('abbreviates thousands', () => {
    expect(abbreviateNumber(1_500)).toBe('1.5k')
  })

  it('returns small numbers as-is', () => {
    expect(abbreviateNumber(42)).toBe('42')
  })
})

describe('formatNumber', () => {
  it('formats with no decimals by default', () => {
    expect(formatNumber(1234)).toBe('1,234')
  })

  it('formats with specified decimals', () => {
    expect(formatNumber(1234.567, 2)).toMatch(/1,234\.5[67]/)
  })

  it('returns -- for NaN', () => {
    expect(formatNumber(NaN)).toBe('--')
  })

  it('returns -- for null', () => {
    expect(formatNumber(null as unknown as number)).toBe('--')
  })
})

describe('formatDate', () => {
  it('returns "just now" for recent timestamps', () => {
    expect(formatDate(Date.now() - 5000)).toBe('just now')
  })

  it('returns minutes ago', () => {
    expect(formatDate(Date.now() - 5 * 60_000)).toBe('5m ago')
  })

  it('returns hours ago', () => {
    expect(formatDate(Date.now() - 3 * 3_600_000)).toBe('3h ago')
  })

  it('returns formatted date for old timestamps', () => {
    const result = formatDate(Date.now() - 2 * 86_400_000)
    expect(result).toMatch(/\w+ \d+/)
  })
})

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(5000)).toBe('5s')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(125_000)).toBe('2m 5s')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(3_725_000)).toBe('1h 2m')
  })
})

describe('formatPercent', () => {
  it('formats with two decimal places', () => {
    expect(formatPercent(12.345)).toBe('12.35%')
  })

  it('formats negative numbers', () => {
    expect(formatPercent(-5.1)).toBe('-5.10%')
  })
})

describe('truncateUuid', () => {
  it('truncates long UUIDs', () => {
    const uuid = 'abcdef1234567890abcdef1234567890'
    expect(truncateUuid(uuid)).toBe('abcdef...567890')
  })

  it('returns short strings unchanged', () => {
    expect(truncateUuid('short')).toBe('short')
  })
})
