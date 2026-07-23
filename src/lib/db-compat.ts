/**
 * Database compatibility helpers.
 * Abstracts differences between PostgreSQL and MySQL so the rest of the
 * codebase stays provider-agnostic.
 *
 * DATABASE_PROVIDER is written to .env.local by the setup wizard and read
 * at runtime. Defaults to 'postgresql' for backward compatibility.
 */

export type DbProvider = 'postgresql' | 'mysql'

export function getProvider(): DbProvider {
  const p = process.env.DATABASE_PROVIDER ?? 'postgresql'
  return p === 'mysql' ? 'mysql' : 'postgresql'
}

/**
 * Spread into Prisma `contains` / `startsWith` / `endsWith` filters to get
 * case-insensitive search on both providers.
 *
 * MySQL with utf8mb4_unicode_ci is case-insensitive by default — no extra flag needed.
 * PostgreSQL requires mode: 'insensitive' explicitly.
 *
 * Usage:
 *   where: { name: { contains: q, ...ci() } }
 */
export function ci(): { mode: 'insensitive' } | Record<string, never> {
  return getProvider() === 'postgresql' ? { mode: 'insensitive' as const } : {}
}

/**
 * Raw SQL fragment: group/format a DateTime column by calendar day.
 *
 * PostgreSQL: TO_CHAR(DATE_TRUNC('day', col), 'YYYY-MM-DD')
 * MySQL:      DATE_FORMAT(col, '%Y-%m-%d')
 */
export function sqlDayFormat(col: string): string {
  return getProvider() === 'mysql'
    ? `DATE_FORMAT(${col}, '%Y-%m-%d')`
    : `TO_CHAR(DATE_TRUNC('day', ${col}), 'YYYY-MM-DD')`
}

/**
 * Quote an identifier (table or column name) for the active provider.
 * PostgreSQL uses "double quotes", MySQL uses `backticks`.
 */
export function q(identifier: string): string {
  return getProvider() === 'mysql' ? `\`${identifier}\`` : `"${identifier}"`
}
