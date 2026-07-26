import { prisma } from '@/lib/db'

/**
 * Derives a unique, login-safe username from an email or name when the caller
 * doesn't provide one explicitly (email is the preferred/primary field on
 * account-creation forms — username only needs to exist to disambiguate
 * accounts that share an email).
 */
export async function generateUniqueUsername(base: string): Promise<string> {
  const cleaned = base
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '')
    .slice(0, 24) || 'user'

  let candidate = cleaned
  let suffix = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.user.findUnique({ where: { username: candidate } })
    if (!existing) return candidate
    suffix += 1
    candidate = `${cleaned}${suffix}`
  }
}
