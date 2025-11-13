/**
 * Shared import cache for two-step import process
 * In production, use Redis or database instead
 */
export const importCache = new Map<string, any>()

/**
 * Import status cache (stores completion status)
 */
export const importStatusCache = new Map<string, {
  status: 'processing' | 'completed' | 'failed'
  summary?: {
    total: number
    created: number
    skipped: number
    errors: number
    successRate: string
  }
  completedAt?: number
  error?: string
}>()

/**
 * Clean up old cache entries (older than 1 hour)
 */
export function cleanupCache() {
  for (const [key, value] of importCache.entries()) {
    if (Date.now() - value.timestamp > 3600000) {
      importCache.delete(key)
    }
  }
  
  // Clean up old status entries (older than 24 hours)
  for (const [key, value] of importStatusCache.entries()) {
    if (value.completedAt && Date.now() - value.completedAt > 86400000) {
      importStatusCache.delete(key)
    }
  }
}

