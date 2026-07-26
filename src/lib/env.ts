/**
 * Startup env validation. Runs once on server init (imported by db.ts).
 * Only writes to .env.local if AUTH_SECRET is truly missing.
 * Does NOT write on every request — file writes trigger Next.js Fast Refresh.
 *
 * IMPORTANT: NextAuth v5 reads AUTH_SECRET (not NEXTAUTH_SECRET). On serverless hosts
 * (Vercel) this file-write fallback doesn't persist across instances/cold starts anyway —
 * AUTH_SECRET must be set as a real platform env var there, or every instance signs
 * JWTs with a different ephemeral secret and users get logged out at random.
 */

if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Backward-compat: an older deploy may have only ever set NEXTAUTH_SECRET.
  if (!process.env.AUTH_SECRET && process.env.NEXTAUTH_SECRET) {
    process.env.AUTH_SECRET = process.env.NEXTAUTH_SECRET
  }

  // Auto-generate AUTH_SECRET only if it has never been set (local/cPanel filesystem hosts only)
  if (!process.env.AUTH_SECRET && !process.env.VERCEL) {
    try {
      const crypto = require('crypto') as typeof import('crypto')
      const fs = require('fs') as typeof import('fs')
      const path = require('path') as typeof import('path')

      const envPath = path.join(process.cwd(), '.env.local')
      const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''

      // Double-check it's really not in the file before writing
      if (!existing.includes('AUTH_SECRET=')) {
        const secret = crypto.randomBytes(32).toString('base64')
        fs.writeFileSync(envPath, `AUTH_SECRET="${secret}"\n${existing}`, 'utf-8')
        process.env.AUTH_SECRET = secret
        console.log('[ismart] AUTH_SECRET auto-generated.')
      }
    } catch {
      // Non-fatal — can be set manually
    }
  } else if (!process.env.AUTH_SECRET && process.env.VERCEL) {
    console.error('[ismart] AUTH_SECRET is not set! Set it in Vercel project env vars — without it, sessions will randomly invalidate across serverless instances.')
  }

  // Hints only — no file writes
  if (!process.env.DATABASE_URL) {
    console.log('[ismart] No DATABASE_URL — visit /setup to configure the database.')
  }
}

export {}
