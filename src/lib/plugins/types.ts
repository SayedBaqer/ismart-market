import type { ComponentType } from 'react'

// ── Hook system types ─────────────────────────────────────────────────────────

export type ActionHandler<T = unknown> = (payload: T) => void | Promise<void>
export type FilterHandler<T = unknown> = (value: T) => T | Promise<T>

export interface HookSystem {
  /** Register a side-effect handler. Multiple handlers run in priority order. */
  addAction<T = unknown>(hook: string, handler: ActionHandler<T>, priority?: number): void
  /** Register a value transformer. Multiple handlers chain in priority order. */
  addFilter<T = unknown>(hook: string, handler: FilterHandler<T>, priority?: number): void
  /** Fire all action handlers for a hook. */
  doAction<T = unknown>(hook: string, payload?: T): Promise<void>
  /** Run all filter handlers for a hook and return the final value. */
  applyFilter<T = unknown>(hook: string, value: T): Promise<T>
  /** Remove all handlers for a hook (useful in tests / deactivation). */
  removeAll(hook: string): void
}

// ── Well-known hooks ─────────────────────────────────────────────────────────

export type KnownHooks = {
  // Storefront
  'storefront.home.sections': HomepageSection[]
  'storefront.product.detail.tabs': ProductTab[]
  // Checkout
  'checkout.payment_methods': PaymentMethod[]
  'checkout.shipping_methods': ShippingMethod[]
  // Admin
  'admin.menu.items': AdminMenuItem[]
  'admin.dashboard.cards': DashboardCard[]
  'admin.product.fields': ProductField[]
  'admin.report.tabs': ReportTab[]
  // Lifecycle actions
  'order.created': { orderId: string }
  'order.completed': { orderId: string }
  'stock.adjusted': { productId: string; qty: number; type: string }
  'invoice.finalised': { documentId: string }
}

// ── UI extension types ────────────────────────────────────────────────────────

export interface HomepageSection {
  id: string
  component: ComponentType<{ config: Record<string, unknown> }>
  order: number
  defaultConfig?: Record<string, unknown>
  label: string
}

export interface ProductTab {
  id: string
  label: string
  component: ComponentType<{ productId: string }>
}

export interface PaymentMethod {
  id: string
  label: string
  description?: string
  handler: (order: unknown) => Promise<{ success: boolean; reference?: string }>
}

export interface ShippingMethod {
  id: string
  label: string
  calculateCost: (order: unknown) => Promise<number>
}

export interface AdminMenuItem {
  id: string
  label: string
  href: string
  icon?: string
  parent?: string
  order?: number
  capability?: string
}

export interface DashboardCard {
  id: string
  component: ComponentType
  order: number
  width?: 'full' | 'half' | 'third'
}

export interface ProductField {
  id: string
  label: string
  component: ComponentType<{ productId: string; value: unknown; onChange: (v: unknown) => void }>
}

export interface ReportTab {
  id: string
  label: string
  component: ComponentType
}

// ── Plugin definition ─────────────────────────────────────────────────────────

export interface PluginDefinition {
  slug: string
  name: string
  version: string
  description?: string
  register: (hooks: HookSystem) => void | Promise<void>
  onActivate?: () => void | Promise<void>
  onDeactivate?: () => void | Promise<void>
}
