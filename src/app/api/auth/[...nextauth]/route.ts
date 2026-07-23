import { handlers } from '@/auth'
import type { NextRequest } from 'next/server'
import { rateLimit, rlKey, tooManyRequests } from '@/lib/rate-limit'

export const GET = handlers.GET

// Wrap POST to rate-limit sign-in attempts: 10 per 15 minutes per IP
export async function POST(req: NextRequest) {
  const result = rateLimit(rlKey(req, 'auth'), { limit: 10, windowMs: 15 * 60 * 1000 })
  if (!result.allowed) return tooManyRequests(result.resetAt)
  return handlers.POST(req)
}
