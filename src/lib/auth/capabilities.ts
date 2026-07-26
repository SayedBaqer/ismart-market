import type { UserRole } from '@prisma/client'

export type Capability =
  // Products
  | 'products.view'
  | 'products.create'
  | 'products.edit'
  | 'products.delete'
  // Categories
  | 'categories.view'
  | 'categories.create'
  | 'categories.edit'
  | 'categories.delete'
  // Stock
  | 'stock.view'
  | 'stock.adjust'
  | 'stock.import'
  | 'stock.batches.delete'
  // Orders
  | 'orders.view'
  | 'orders.create'
  | 'orders.edit'
  | 'orders.update_status'
  | 'orders.delete'
  // Billing
  | 'billing.view'
  | 'billing.create'
  | 'billing.edit'
  | 'billing.delete'
  | 'billing.payments'
  // Customers
  | 'customers.view'
  | 'customers.create'
  | 'customers.edit'
  | 'customers.delete'
  // Reports
  | 'reports.view'
  | 'reports.financial'
  // Users
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  // Settings
  | 'settings.view'
  | 'settings.edit'
  // Plugins
  | 'plugins.manage'
  // Content
  | 'news.view'
  | 'news.create'
  | 'news.edit'
  | 'news.delete'

export const roleCapabilities: Record<UserRole, Capability[]> = {
  SUPER_ADMIN: [
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'categories.view', 'categories.create', 'categories.edit', 'categories.delete',
    'stock.view', 'stock.adjust', 'stock.import', 'stock.batches.delete',
    'orders.view', 'orders.edit', 'orders.delete',
    'billing.view', 'billing.create', 'billing.edit', 'billing.delete', 'billing.payments',
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
    'reports.view', 'reports.financial',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'settings.view', 'settings.edit',
    'plugins.manage',
    'news.view', 'news.create', 'news.edit', 'news.delete',
  ],
  ADMIN: [
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'categories.view', 'categories.create', 'categories.edit', 'categories.delete',
    'stock.view', 'stock.adjust', 'stock.import', 'stock.batches.delete',
    'orders.view', 'orders.edit', 'orders.delete',
    'billing.view', 'billing.create', 'billing.edit', 'billing.delete', 'billing.payments',
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
    'reports.view', 'reports.financial',
    'users.view', 'users.create', 'users.edit',
    'settings.view', 'settings.edit',
    'plugins.manage',
    'news.view', 'news.create', 'news.edit', 'news.delete',
  ],
  MANAGER: [
    'products.view', 'products.create', 'products.edit',
    'categories.view',
    'stock.view', 'stock.adjust', 'stock.import',
    'orders.view', 'orders.edit',
    'billing.view', 'billing.create', 'billing.edit', 'billing.payments',
    'customers.view', 'customers.create', 'customers.edit',
    'reports.view', 'reports.financial',
    'news.view', 'news.create', 'news.edit',
  ],
  STAFF: [
    'products.view',
    'categories.view',
    'stock.view', 'stock.adjust',
    'orders.view', 'orders.edit',
    'billing.view', 'billing.create',
    'customers.view', 'customers.create',
    'reports.view',
    'news.view',
  ],
  CASHIER: [
    'products.view',
    'stock.view',
    'orders.view', 'orders.edit',
    'billing.view', 'billing.create', 'billing.payments',
    'customers.view', 'customers.create',
  ],
  CUSTOMER: [],
}

export function hasCapability(
  role: UserRole,
  overrides: Record<string, boolean>,
  cap: Capability,
): boolean {
  // When explicit overrides exist, they act as a strict whitelist — role defaults are ignored.
  // This allows delivery drivers / restricted users to have only what they were granted.
  if (Object.keys(overrides).length > 0) {
    return overrides[cap] === true
  }
  return roleCapabilities[role]?.includes(cap) ?? false
}

// Returns the first admin route the user has access to
export function firstAccessibleAdminRoute(
  role: UserRole,
  overrides: Record<string, boolean>,
): string {
  if (hasCapability(role, overrides, 'products.view')) return '/admin'
  if (hasCapability(role, overrides, 'orders.view')) return '/admin/orders'
  if (hasCapability(role, overrides, 'billing.view')) return '/admin/billing'
  if (hasCapability(role, overrides, 'customers.view')) return '/admin/customers'
  if (hasCapability(role, overrides, 'stock.view')) return '/admin/stock'
  if (hasCapability(role, overrides, 'reports.view')) return '/admin/reports'
  return '/admin/orders'
}
