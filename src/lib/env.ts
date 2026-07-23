/**
 * Startup env validation. Runs once on server init (imported by db.ts).
 * Only writes to .env.local if NEXTAUTH_SECRET is truly missing.
 * Does NOT write on every request — file writes trigger Next.js Fast Refresh.
 */

if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Auto-generate NEXTAUTH_SECRET only if it has never been set
  if (!process.env.NEXTAUTH_SECRET) {
    try {
      const crypto = require('crypto') as typeof import('crypto')
      const fs = require('fs') as typeof import('fs')
      const path = require('path') as typeof import('path')

      const envPath = path.join(process.cwd(), '.env.local')
      const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''

      // Double-check it's really not in the file before writing
      if (!existing.includes('NEXTAUTH_SECRET=')) {
        const secret = crypto.randomBytes(32).toString('base64')
        fs.writeFileSync(envPath, `NEXTAUTH_SECRET="${secret}"\n${existing}`, 'utf-8')
        process.env.NEXTAUTH_SECRET = secret
        console.log('[ismart] NEXTAUTH_SECRET auto-generated.')
      }
    } catch {
      // Non-fatal — can be set manually
    }
  }

  // Hints only — no file writes
  if (!process.env.DATABASE_URL) {
    console.log('[ismart] No DATABASE_URL — visit /setup to configure the database.')
  }
}

export {}
