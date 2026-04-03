export interface ApiMeta {
  cached: boolean
  cache_age_seconds: number
  timestamp: number
}

export interface ApiResponse<T> {
  data: T
  meta: ApiMeta
}

export interface ApiEnvelope<T> {
  success: boolean
  data: T
  meta: ApiMeta
}

export interface ApiError {
  success: false
  code: string
  message: string
  status: number
}

export interface AppError {
  code: string
  message: string
  status: number
}

// Health
export interface ServiceStatus {
  healthy: boolean
  latency?: number
  lastCheck?: number
}

export interface HealthResponse {
  status: 'ok' | 'degraded'
  services: Record<string, boolean | ServiceStatus>
}

// Player
export interface PlayerUuidResponse {
  id: string
  name?: string
}

export interface PlayerUsernameResponse {
  username: string
}

export interface SkillData {
  level: number
  xp: number
  maxLevel?: number
  progress: number
  overflow?: number
}

export interface SlayerData {
  level: number
  xp: number
  boss_kills?: Record<string, number>
}

export interface DungeonClass {
  level: number
  xp?: number
  progress?: number
}

export interface DungeonsData {
  catacombs_level: number
  catacombs_xp?: number
  classes?: Record<string, DungeonClass>
  class_levels?: Record<string, number>
  secrets_found?: number
  selected_class?: string
  master_mode_completions?: Record<string, number>
}

export interface NetworthBreakdown {
  purse: number
  bank: number
  inventory: number
  armor: number
  wardrobe: number
  pets: number
  storage: number
  accessories: number
  misc: number
}

export interface NetworthData {
  total: number
  breakdown: NetworthBreakdown
}

export interface ProfileSummary {
  profile_id: string
  cute_name: string
  selected: boolean
}

export interface ProfileV2 {
  uuid: string
  profile_id: string
  cute_name: string
  skills: Record<string, SkillData>
  skill_average: number
  slayers: Record<string, SlayerData>
  dungeons: DungeonsData
  networth: NetworthData
  raw?: unknown
}

// Bazaar (V1 listing — Hypixel's inverted naming)
export interface BazaarProductRaw {
  product_id: string
  sell_summary: BazaarOrder[]
  buy_summary: BazaarOrder[]
  quick_status?: BazaarQuickStatus
}

export interface BazaarOrder {
  amount: number
  pricePerUnit: number
  orders: number
}

export interface BazaarQuickStatus {
  productId: string
  sellPrice: number
  sellVolume: number
  sellMovingWeek: number
  sellOrders: number
  buyPrice: number
  buyVolume: number
  buyMovingWeek: number
  buyOrders: number
}

export interface BazaarItemV2 {
  item_id: string
  name?: string
  sell_price: number
  buy_price: number
  sell_volume: number
  buy_volume: number
  sell_orders: BazaarOrder[]
  buy_orders: BazaarOrder[]
  spread: number
  spread_percent: number
}

export interface BazaarHistoryPoint {
  timestamp: number
  sell_price: number
  buy_price: number
  sell_volume?: number
  buy_volume?: number
}

export type BazaarHistory = BazaarHistoryPoint[]

export interface BazaarHistoryDatapoint {
  timestamp: number
  instant_buy_price: number
  instant_sell_price: number
  avg_buy_price: number
  avg_sell_price: number
  buy_volume: number
  sell_volume: number
}

export interface BazaarHistorySummary {
  avg_instant_buy: number
  avg_instant_sell: number
  avg_buy: number
  avg_sell: number
}

export interface BazaarHistoryV2 {
  item_id: string
  range: string
  resolution: string
  count: number
  summary: BazaarHistorySummary
  datapoints: BazaarHistoryDatapoint[]
}

// Bazaar V2 Bulk
export interface BazaarProductV2 {
  item_id: string
  display_name: string
  category?: string
  tier?: string
  instant_buy_price: number
  instant_sell_price: number
  buy_volume: number
  sell_volume: number
  buy_orders: number
  sell_orders: number
  buy_moving_week: number
  sell_moving_week: number
  margin: number
  margin_percent: number
  tax_adjusted_margin: number
}

export interface BazaarBulkResponse {
  items: BazaarProductV2[]
  total: number
  limit: number
  offset: number
}

// Bazaar Movers
export interface BazaarMover {
  item_id: string
  display_name: string
  current_instant_buy: number
  previous_instant_buy: number
  change: number
  change_percent: number
}

export interface BazaarMoversResponse {
  gainers: BazaarMover[]
  losers: BazaarMover[]
  range: string
}

// Auctions
export interface LowestBinItem {
  item_id: string
  skyblock_id?: string
  name: string
  tier: string
  lowest_price: number
  auction_uuid?: string
}

export type LowestBins = LowestBinItem[]

export interface AuctionSearchResult {
  uuid: string
  item_name: string
  tier: string
  starting_bid: number
  highest_bid_amount: number
  bin: boolean
  end: number
  seller: string
}

export interface PlayerAuction {
  uuid: string
  item_name: string
  tier: string
  starting_bid: number
  highest_bid_amount: number
  bin: boolean
  end: number
  claimed: boolean
}

export interface EndedAuction {
  uuid: string
  item_name: string
  tier: string
  price: number
  buyer?: string
  seller: string
  timestamp: number
  bin: boolean
}

// Auction Price History
export interface AuctionHistoryDatapoint {
  timestamp: number
  lowest_bin: number
  median_bin: number | null
  listing_count: number
  sale_count: number
  avg_sale_price: number | null
}

export interface AuctionHistorySummary {
  avg_lowest_bin: number
  min_lowest_bin: number
  max_lowest_bin: number
  total_sales: number
  avg_sale_price: number | null
}

export interface AuctionHistoryV2 {
  item: string
  skyblock_id: string
  range: string
  resolution: string
  sparse: boolean
  count: number
  summary: AuctionHistorySummary | null
  datapoints: AuctionHistoryDatapoint[]
}

// Items
export interface ItemV2 {
  id: string
  name: string
  tier: string
  category?: string
  material?: string
  npc_sell_price?: number
  [key: string]: unknown
}

// Item Textures
export interface TextureVanilla {
  type: 'vanilla'
  material: string
  durability?: number
  glowing?: boolean
}

export interface TextureSkull {
  type: 'skull'
  material: string
  durability?: number
  skin_url?: string
}

export interface TextureLeather {
  type: 'leather'
  material: string
  color: [number, number, number]
}

export interface TextureItemModel {
  type: 'item_model'
  material: string
  item_model: string
}

export type TextureData = TextureVanilla | TextureSkull | TextureLeather | TextureItemModel

export type TextureMap = Record<string, TextureData>

// Admin
export interface WatchedPlayer {
  uuid: string
  username?: string
  added_at?: number
}

export interface GenerateKeyBody {
  owner: string
  tier: 'client' | 'public'
  rate_limit?: number
}

export interface GeneratedKey {
  key: string
  owner: string
  tier: string
}

export interface ApiKeyInfo {
  owner: string
  tier: string
  rate_limit: number
  created_at: number
}

// SSE Events
export interface BazaarSseEvent {
  item_id: string
  field: string
  old_value: number | string
  new_value: number | string
  timestamp: number
}

// WebSocket
export interface WsMessage {
  action: 'subscribe' | 'unsubscribe'
  channel: string
  filters?: Record<string, unknown>
}

export interface WsEvent {
  channel: string
  data: unknown
  timestamp: number
}

// Settings
export interface AppSettings {
  apiBaseUrl: string
  authMode: 'apikey' | 'hmac' | 'bypass'
  apiKey: string
  hmacSecret: string
  autoRefreshInterval: number
  priceAbbreviated: boolean
  theme: 'dark' | 'light'
  showChartAnnotations: boolean
  showStatsBar: boolean
  liveDataMode: 'off' | 'full' | 'extrapolated'
  requestTimeout: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  authMode: 'bypass',
  apiKey: '',
  hmacSecret: '',
  autoRefreshInterval: 60,
  priceAbbreviated: true,
  theme: 'dark',
  showChartAnnotations: true,
  showStatsBar: true,
  liveDataMode: 'off',
  requestTimeout: 15_000,
}
