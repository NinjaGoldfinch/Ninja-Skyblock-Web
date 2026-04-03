import type { ZodType, ZodError } from 'zod'

export class ValidationError extends Error {
  issues: ZodError['issues']

  constructor(error: ZodError) {
    super(`Response validation failed: ${error.issues.map((i) => i.message).join(', ')}`)
    this.name = 'ValidationError'
    this.issues = error.issues
  }
}

/**
 * Validate and transform API response data with a Zod schema.
 * On failure, logs a warning and returns the raw data as-is
 * so the UI doesn't break from schema drift.
 */
export function validateResponse<T>(data: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.warn('[validate] Response shape mismatch:', result.error.issues)
    // Return raw data instead of throwing — graceful degradation
    return data as T
  }
  return result.data
}
