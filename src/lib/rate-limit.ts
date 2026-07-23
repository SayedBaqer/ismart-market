/**
 * In-process sliding-window rate limiter.
 * Works for single-instance deployments (self-hosted).
 * For multi-instance, replace the Map with Redis.
 */

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

// Prune stale entries every 5 minutes so the Map doesn't grow unbounded
setInterval(
  () => {
    const now = Date.now()
    for (const [key, win] of store) {
      if (win.resetAt < now) store.delete(key)
    }
  },
  5 * 60 * 1000,
)

export interface RateLimitOptions {
  /** Max requests per window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check and increment the counter for `key`.
 * Call once per request; returns `allowed: false` when the limit is exceeded.
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const win = store.get(key)

  if (!win || win.resetAt <= now) {
    // New window
    const resetAt = now + opts.windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: opts.limit - 1, resetAt }
  }

  if (win.count >= opts.limit) {
    return { allowed: false, remaining: 0, resetAt: win.resetAt }
  }

  win.count++
  return { allowed: true, remaining: opts.limit - win.count, resetAt: win.resetAt }
}

/**
 * Build a rate-limit key from a request.
 * Uses the real IP from common proxy headers, falling back to a static key.
 */
export function rlKey(req: Request, prefix: string): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return `${prefix}:${ip}`
}

/** Returns a 429 NextResponse with Retry-After header */
export function tooManyRequests(resetAt: number) {
  const { NextResponse } = require('next/server') as typeof import('next/server')
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
  return NextResponse.json(
    { error: 'Too many requests. Please slow down.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    },
  )
}
