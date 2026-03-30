import { apiGet, apiPost, apiDelete } from './client'
import type {
  HealthResponse,
  ProfileV2,
  ProfileSummary,
  BazaarProduct,
  BazaarItemV2,
  BazaarHistory,
  LowestBins,
  AuctionSearchResult,
  PlayerAuction,
  EndedAuction,
  ItemV2,
  WatchedPlayer,
  GenerateKeyBody,
  GeneratedKey,
  ApiKeyInfo,
  PlayerUuidResponse,
  PlayerUsernameResponse,
} from '@/types/api'

// Health
export const getHealth = () => apiGet<HealthResponse>('/v1/health')

// Player
export const resolveUsername = (username: string) =>
  apiGet<PlayerUuidResponse>(`/v1/player/uuid/${encodeURIComponent(username)}`)

export const resolveUuid = (uuid: string) =>
  apiGet<PlayerUsernameResponse>(`/v1/player/username/${encodeURIComponent(uuid)}`)

// Profiles
export const getProfiles = (playerUuid: string) =>
  apiGet<ProfileSummary[]>(`/v2/skyblock/profiles/${encodeURIComponent(playerUuid)}`)

export const getProfile = (profileUuid: string) =>
  apiGet<ProfileV2>(`/v2/skyblock/profile/${encodeURIComponent(profileUuid)}`)

export const getProfileV1 = (profileUuid: string) =>
  apiGet<unknown>(`/v1/skyblock/profile/${encodeURIComponent(profileUuid)}`)

// Bazaar
export const getBazaar = () => apiGet<Record<string, BazaarProduct>>('/v1/skyblock/bazaar')

export const getBazaarItem = (itemId: string) =>
  apiGet<BazaarItemV2>(`/v2/skyblock/bazaar/${encodeURIComponent(itemId)}`)

export const getBazaarHistory = (itemId: string) =>
  apiGet<BazaarHistory>(`/v2/skyblock/bazaar/${encodeURIComponent(itemId)}/history`)

// Auctions
export const getLowestBins = () => apiGet<LowestBins>('/v2/skyblock/auctions/lowest')

export const getLowestBinsByKey = () =>
  apiGet<Record<string, LowestBins>>('/v2/skyblock/auctions/lowest', { key_by: 'skyblock_id' })

export const getLowestBinItem = (item: string) =>
  apiGet<LowestBins>(`/v2/skyblock/auctions/lowest/${encodeURIComponent(item)}`)

export const searchAuctions = (term: string) =>
  apiGet<AuctionSearchResult[]>('/v2/skyblock/auctions/search', { search: term })

export const getPlayerAuctions = (playerUuid: string) =>
  apiGet<PlayerAuction[]>(`/v1/skyblock/auctions/player/${encodeURIComponent(playerUuid)}`)

export const getEndedAuctions = () =>
  apiGet<EndedAuction[]>('/v1/skyblock/auctions/ended')

// Items
export const getItems = () => apiGet<ItemV2[]>('/v2/skyblock/items')

export const getItem = (itemId: string) =>
  apiGet<ItemV2>(`/v2/skyblock/items/${encodeURIComponent(itemId)}`)

export const lookupItemName = (name: string) =>
  apiGet<{ skyblock_id: string }>(`/v2/skyblock/items/lookup/${encodeURIComponent(name)}`)

// Collections, Skills, Election
export const getCollections = () => apiGet<unknown>('/v1/skyblock/collections')
export const getSkills = () => apiGet<unknown>('/v1/skyblock/skills')
export const getElection = () => apiGet<unknown>('/v1/skyblock/election')

// Admin
export const getApiKeys = () => apiGet<ApiKeyInfo[]>('/v1/admin/keys')

export const generateApiKey = (body: GenerateKeyBody) =>
  apiPost<GeneratedKey>('/v1/admin/keys', body)

export const getWatchedPlayers = () =>
  apiGet<WatchedPlayer[]>('/v1/admin/watched-players')

export const addWatchedPlayer = (uuid: string) =>
  apiPost('/v1/admin/watched-players', { uuid })

export const removeWatchedPlayer = (uuid: string) =>
  apiDelete(`/v1/admin/watched-players/${encodeURIComponent(uuid)}`)
