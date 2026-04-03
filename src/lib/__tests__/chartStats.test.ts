import { describe, it, expect } from 'vitest'
import { computePriceStats, type NormalizedPricePoint } from '../chartStats'

function makePoints(data: [number, number, number][]): NormalizedPricePoint[] {
  return data.map(([timestamp, buyPrice, sellPrice]) => ({
    timestamp,
    buyPrice,
    sellPrice,
  }))
}

describe('computePriceStats', () => {
  it('returns null for empty input', () => {
    expect(computePriceStats([])).toBeNull()
  })

  it('returns stats when all prices are zero (zero is valid)', () => {
    const points = makePoints([[1000, 0, 0], [2000, 0, 0]])
    const stats = computePriceStats(points)!
    expect(stats).not.toBeNull()
    expect(stats.highBuy).toBe(0)
    expect(stats.lowBuy).toBe(0)
  })

  it('computes high/low/avg for buy prices', () => {
    const points = makePoints([
      [1000, 10, 0],
      [2000, 20, 0],
      [3000, 15, 0],
    ])
    const stats = computePriceStats(points)!

    expect(stats.highBuy).toBe(20)
    expect(stats.lowBuy).toBe(10)
    expect(stats.avgBuy).toBe(15)
    expect(stats.highBuyTimestamp).toBe(2000)
    expect(stats.lowBuyTimestamp).toBe(1000)
  })

  it('computes high/low/avg for sell prices', () => {
    const points = makePoints([
      [1000, 0, 5],
      [2000, 0, 25],
      [3000, 0, 10],
    ])
    const stats = computePriceStats(points)!

    expect(stats.highSell).toBe(25)
    expect(stats.lowSell).toBe(5)
    expect(stats.avgSell).toBeCloseTo(13.33, 1)
    expect(stats.highSellTimestamp).toBe(2000)
    expect(stats.lowSellTimestamp).toBe(1000)
  })

  it('computes current prices from last point', () => {
    const points = makePoints([
      [1000, 10, 8],
      [2000, 12, 9],
    ])
    const stats = computePriceStats(points)!

    expect(stats.currentBuy).toBe(12)
    expect(stats.currentSell).toBe(9)
  })

  it('computes spread as sell - buy of last point', () => {
    const points = makePoints([
      [1000, 100, 90],
      [2000, 110, 95],
    ])
    const stats = computePriceStats(points)!

    expect(stats.spread).toBe(-15)
  })

  it('computes percent change from first to last', () => {
    const points = makePoints([
      [1000, 100, 50],
      [2000, 120, 60],
    ])
    const stats = computePriceStats(points)!

    expect(stats.pctChangeBuy).toBeCloseTo(20)
    expect(stats.pctChangeSell).toBeCloseTo(20)
  })

  it('handles single point', () => {
    const points = makePoints([[1000, 100, 50]])
    const stats = computePriceStats(points)!

    expect(stats.highBuy).toBe(100)
    expect(stats.lowBuy).toBe(100)
    expect(stats.pctChangeBuy).toBe(0)
  })

  it('includes zero prices in aggregation (zero = no orders)', () => {
    const points = makePoints([
      [1000, 100, 50],
      [2000, 0, 60],
      [3000, 120, 0],
    ])
    const stats = computePriceStats(points)!

    expect(stats.avgBuy).toBeCloseTo((100 + 0 + 120) / 3)
    expect(stats.avgSell).toBeCloseTo((50 + 60 + 0) / 3)
    expect(stats.lowBuy).toBe(0)
    expect(stats.lowSell).toBe(0)
  })
})
