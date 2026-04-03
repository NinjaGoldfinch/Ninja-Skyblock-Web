import type { ZodType } from 'zod'
import type { ApiEnvelope, ApiResponse, AppError } from '@/types/api'
import { getApiBaseUrl } from '@/lib/settings'
import { buildAuthHeaders, generateHmacSignature } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { validateResponse } from '@/lib/validate'

export class ApiRequestError extends Error {
  code: string
  status: number

  constructor(error: AppError) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.code = error.code
    this.status = error.status
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const { requestTimeout } = getSettings()
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(requestTimeout) })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new ApiRequestError({ code: 'TIMEOUT', message: 'Request timed out', status: 0 })
    }
    throw err
  }
}

async function buildHeaders(body?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders(),
  }

  const settings = getSettings()
  if (settings.authMode === 'hmac' && settings.hmacSecret) {
    const timestamp = headers['X-Timestamp'] ?? Math.floor(Date.now() / 1000).toString()
    headers['X-Timestamp'] = timestamp
    headers['X-Signature'] = await generateHmacSignature(
      settings.hmacSecret,
      timestamp,
      body
    )
  }

  return headers
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string>,
  schema?: ZodType<T>
): Promise<ApiResponse<T>> {
  const base = getApiBaseUrl()
  const url = new URL(path, base)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
  }

  const headers = await buildHeaders()
  const res = await fetchWithTimeout(url.toString(), { headers })

  if (!res.ok) {
    let error: AppError
    try {
      const body = await res.json()
      error = {
        code: body.code ?? 'UNKNOWN_ERROR',
        message: body.message ?? res.statusText,
        status: res.status,
      }
    } catch {
      error = {
        code: 'NETWORK_ERROR',
        message: res.statusText,
        status: res.status,
      }
    }
    throw new ApiRequestError(error)
  }

  const envelope: ApiEnvelope<T> = await res.json()

  if (!envelope.success) {
    throw new ApiRequestError({
      code: (envelope as unknown as { code: string }).code ?? 'API_ERROR',
      message: (envelope as unknown as { message: string }).message ?? 'Request failed',
      status: res.status,
    })
  }

  const data = schema ? validateResponse(envelope.data, schema) : envelope.data

  return {
    data,
    meta: envelope.meta,
  }
}

export async function apiPost<T>(
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const base = getApiBaseUrl()
  const url = new URL(path, base)
  const bodyStr = body ? JSON.stringify(body) : undefined
  const headers = await buildHeaders(bodyStr)

  const res = await fetchWithTimeout(url.toString(), {
    method: 'POST',
    headers,
    body: bodyStr,
  })

  if (!res.ok) {
    let error: AppError
    try {
      const b = await res.json()
      error = { code: b.code ?? 'UNKNOWN_ERROR', message: b.message ?? res.statusText, status: res.status }
    } catch {
      error = { code: 'NETWORK_ERROR', message: res.statusText, status: res.status }
    }
    throw new ApiRequestError(error)
  }

  const envelope: ApiEnvelope<T> = await res.json()
  return { data: envelope.data, meta: envelope.meta }
}

export async function apiDelete<T>(path: string): Promise<ApiResponse<T>> {
  const base = getApiBaseUrl()
  const url = new URL(path, base)
  const headers = await buildHeaders()

  const res = await fetchWithTimeout(url.toString(), { method: 'DELETE', headers })

  if (!res.ok) {
    let error: AppError
    try {
      const b = await res.json()
      error = { code: b.code ?? 'UNKNOWN_ERROR', message: b.message ?? res.statusText, status: res.status }
    } catch {
      error = { code: 'NETWORK_ERROR', message: res.statusText, status: res.status }
    }
    throw new ApiRequestError(error)
  }

  const envelope: ApiEnvelope<T> = await res.json()
  return { data: envelope.data, meta: envelope.meta }
}
