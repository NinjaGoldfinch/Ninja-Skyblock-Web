import { z } from 'zod'

// --- API envelope ---

export const apiMetaSchema = z.object({
  cached: z.boolean(),
  cache_age_seconds: z.number(),
  timestamp: z.number(),
})

// --- Health ---

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  services: z.record(
    z.string(),
    z.union([
      z.boolean(),
      z.object({
        healthy: z.boolean(),
        latency: z.number().optional(),
        lastCheck: z.number().optional(),
      }),
    ])
  ),
})

// --- Bazaar V2 Product ---
// Use .passthrough() so extra fields from the API aren't stripped,
// and default missing numeric fields to 0 so the UI doesn't break.

export const bazaarProductV2Schema = z.object({
  item_id: z.string(),
  display_name: z.string().default(''),
  category: z.string().optional(),
  tier: z.string().optional(),
  instant_buy_price: z.number().default(0),
  instant_sell_price: z.number().default(0),
  buy_volume: z.number().default(0),
  sell_volume: z.number().default(0),
  buy_orders: z.number().default(0),
  sell_orders: z.number().default(0),
  buy_moving_week: z.number().default(0),
  sell_moving_week: z.number().default(0),
  margin: z.number().default(0),
  margin_percent: z.number().default(0),
  tax_adjusted_margin: z.number().default(0),
}).passthrough()

// --- Bazaar Bulk Response ---
// Normalizes inconsistent shapes: { items: [...] }, { products: [...] }, or raw array

export const bazaarBulkResponseSchema = z
  .union([
    z.object({
      items: z.array(bazaarProductV2Schema).optional(),
      products: z.array(bazaarProductV2Schema).optional(),
      total: z.number().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).passthrough(),
    z.array(bazaarProductV2Schema),
  ])
  .transform((val) => {
    if (Array.isArray(val)) {
      return { items: val, total: val.length, limit: val.length, offset: 0 }
    }
    const items = val.items ?? val.products ?? []
    return {
      items,
      total: val.total ?? items.length,
      limit: val.limit ?? items.length,
      offset: val.offset ?? 0,
    }
  })

export type BazaarBulkResponseNormalized = z.infer<typeof bazaarBulkResponseSchema>

// --- Bazaar History V2 ---

export const bazaarHistoryDatapointSchema = z.object({
  timestamp: z.number(),
  instant_buy_price: z.number().default(0),
  instant_sell_price: z.number().default(0),
  avg_buy_price: z.number().default(0),
  avg_sell_price: z.number().default(0),
  buy_volume: z.number().default(0),
  sell_volume: z.number().default(0),
}).passthrough()

export const bazaarHistoryV2Schema = z.object({
  item_id: z.string(),
  range: z.string(),
  resolution: z.string(),
  count: z.number(),
  summary: z.object({
    avg_instant_buy: z.number(),
    avg_instant_sell: z.number(),
    avg_buy: z.number(),
    avg_sell: z.number(),
  }),
  datapoints: z.array(bazaarHistoryDatapointSchema),
}).passthrough()
