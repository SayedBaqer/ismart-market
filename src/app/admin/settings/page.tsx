'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Store, Building2, Globe, Receipt, Users, Paintbrush,
  FileText, Shield, ToggleLeft, Check, AlertTriangle,
  RefreshCw, Lock, ShoppingCart, Eye, Star,
} from 'lucide-react'

type Settings = Record<string, string>
type Tab = 'general' | 'appearance' | 'legal' | 'features'

// ── Theme presets ─────────────────────────────────────────────────────────────
const THEMES = [
  {
    id: 'blue',
    name: 'Ocean Blue',
    desc: 'Clean professional blue — the default',
    primary: '#2563eb',
    dark: '#1d4ed8',
    hero: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
    accent: '#3b82f6',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    desc: 'Elegant luxury purple with deep hero',
    primary: '#7c3aed',
    dark: '#6d28d9',
    hero: 'linear-gradient(135deg, #1e1b4b 0%, #3b0764 100%)',
    accent: '#8b5cf6',
  },
  {
    id: 'green',
    name: 'Forest Green',
    desc: 'Natural earthy green, eco & fresh',
    primary: '#059669',
    dark: '#047857',
    hero: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)',
    accent: '#10b981',
  },
  {
    id: 'dark',
    name: 'Midnight Gold',
    desc: 'Dark background with gold accents',
    primary: '#f59e0b',
    dark: '#d97706',
    hero: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    accent: '#fbbf24',
  },
  {
    id: 'coral',
    name: 'Coral Rose',
    desc: 'Warm rose-red, vibrant and bold',
    primary: '#e11d48',
    dark: '#be123c',
    hero: 'linear-gradient(135deg, #1c0a14 0%, #4c0519 100%)',
    accent: '#f43f5e',
  },
]

// ── Feature flags ──────────────────────────────────────────────────────────────
const FEATURES = [
  { key: 'features.checkout', label: 'Checkout / Orders', desc: 'Allow customers to place orders', icon: ShoppingCart, danger: true },
  { key: 'features.cart', label: 'Shopping Cart', desc: 'Customers can add products to cart', icon: ShoppingCart },
  { key: 'features.guestCheckout', label: 'Guest Checkout', desc: 'Checkout without creating an account', icon: Users },
  { key: 'features.productSearch', label: 'Product Search', desc: 'Search bar on the storefront', icon: Eye },
  { key: 'features.reviews', label: 'Product Reviews', desc: 'Customers can leave star ratings', icon: Star },
  { key: 'features.wishlist', label: 'Wishlist', desc: 'Save products for later', icon: Star },
  { key: 'features.compareProducts', label: 'Compare Products', desc: 'Side-by-side product comparison', icon: RefreshCw },
  { key: 'features.stockDisplay', label: 'Show Stock Count', desc: 'Display remaining qty on product page', icon: Eye },
]

function Toggle({
  enabled,
  onChange,
  danger,
}: {
  enabled: boolean
  onChange: (v: boolean) => void
  danger?: boolean
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative h-6 w-11 rounded-full transition-all duration-200 focus:outline-none ${
        enabled
          ? danger
            ? 'bg-blue-600'
            : 'bg-blue-600'
          : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<Tab>('general')
  const [userRole, setUserRole] = useState<string>('ADMIN')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings').then((r) => r.json()),
      fetch('/api/admin/me').then((r) => r.json()).catch(() => ({})),
    ]).then(([data, me]) => {
      setSettings(data)
      setUserRole(me?.role ?? 'ADMIN')
      setLoading(false)
    })
  }, [])

  async function save(patch: Partial<Settings>) {
    setSaving(true)
    setSaved(false)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setSettings((prev) => ({ ...prev, ...(patch as Settings) }))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function set(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  async function saveLegal() {
    const currentVersion = parseInt(settings['legal.terms.version'] ?? '1', 10)
    const contentChanged =
      settings['legal.terms.content'] !== settings['_orig.terms'] ||
      settings['legal.privacy.content'] !== settings['_orig.privacy'] ||
      settings['legal.market.content'] !== settings['_orig.market']

    const patch: Partial<Settings> = {
      'legal.terms.content': settings['legal.terms.content'] ?? '',
      'legal.privacy.content': settings['legal.privacy.content'] ?? '',
      'legal.market.content': settings['legal.market.content'] ?? '',
      'legal.terms.required': settings['legal.terms.required'] ?? 'false',
      'legal.terms.version': contentChanged
        ? String(currentVersion + 1)
        : String(currentVersion),
    }
    await save(patch)
    // Update originals so next save doesn't auto-bump version again
    setSettings((prev) => ({
      ...prev,
      '_orig.terms': prev['legal.terms.content'] ?? '',
      '_orig.privacy': prev['legal.privacy.content'] ?? '',
      '_orig.market': prev['legal.market.content'] ?? '',
    }))
  }

  useEffect(() => {
    if (settings['legal.terms.content'] !== undefined) {
      setSettings((prev) => ({
        ...prev,
        '_orig.terms': prev['legal.terms.content'] ?? '',
        '_orig.privacy': prev['legal.privacy.content'] ?? '',
        '_orig.market': prev['legal.market.content'] ?? '',
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <RefreshCw className="h-6 w-6 text-gray-300 animate-spin" />
      </div>
    )
  }

  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const platformMode = settings['platform.mode'] ?? 'single'
  const selectedTheme = settings['theme.preset'] ?? 'blue'

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Building2 className="h-4 w-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Paintbrush className="h-4 w-4" /> },
    { id: 'legal', label: 'Legal & Terms', icon: <FileText className="h-4 w-4" /> },
    { id: 'features', label: 'Feature Flags', icon: <ToggleLeft className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Configure your portal globally</p>
          </div>
          {saved && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 mt-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-4xl">

        {/* ════════ GENERAL ════════ */}
        {tab === 'general' && (
          <>
            {/* Platform mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" /> Platform Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'single', label: 'Single Shop', sub: 'One store, one admin', icon: Store },
                    { id: 'multi', label: 'Multi-Shop Marketplace', sub: 'Multiple shops with approval', icon: Building2 },
                  ].map((opt) => {
                    const Icon = opt.icon
                    return (
                      <button
                        key={opt.id}
                        onClick={() => save({ 'platform.mode': opt.id })}
                        className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                          platformMode === opt.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`h-6 w-6 ${platformMode === opt.id ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`font-semibold text-sm ${platformMode === opt.id ? 'text-blue-800' : 'text-gray-700'}`}>{opt.label}</span>
                        <span className="text-xs text-gray-400">{opt.sub}</span>
                        {platformMode === opt.id && (
                          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white font-medium">Active</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Company */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" /> Company Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Company / Store Name" value={settings['company.name'] ?? ''} onChange={(e) => set('company.name', e.target.value)} />
                  <Input label="Phone" value={settings['company.phone'] ?? ''} onChange={(e) => set('company.phone', e.target.value)} />
                </div>
                <Input label="Address" value={settings['company.address'] ?? ''} onChange={(e) => set('company.address', e.target.value)} />
                <Button onClick={() => save({ 'company.name': settings['company.name'] ?? '', 'company.address': settings['company.address'] ?? '', 'company.phone': settings['company.phone'] ?? '' })} isLoading={saving} size="sm">
                  Save Company Info
                </Button>
              </CardContent>
            </Card>

            {/* Currency */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-4 w-4" /> Currency & Tax
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Base Currency</label>
                    <select value={settings['currency.base'] ?? 'BHD'} onChange={(e) => set('currency.base', e.target.value)} className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="BHD">BHD — Bahraini Dinar</option>
                      <option value="SAR">SAR — Saudi Riyal</option>
                      <option value="AED">AED — UAE Dirham</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="EUR">EUR — Euro</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Language</label>
                    <select value={settings['locale.language'] ?? 'en'} onChange={(e) => { set('locale.language', e.target.value); set('locale.direction', e.target.value === 'ar' ? 'rtl' : 'ltr') }} className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="en">English (LTR)</option>
                      <option value="ar">العربية (RTL)</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Tax / VAT</p>
                    <p className="text-xs text-gray-500">Add tax to product prices</p>
                  </div>
                  <Toggle enabled={settings['tax.enabled'] === 'true'} onChange={(v) => save({ 'tax.enabled': String(v) })} />
                </div>
                {settings['tax.enabled'] === 'true' && (
                  <Input label="Tax Rate (%)" type="number" min={0} max={100} step={0.1} value={settings['tax.rate'] ?? '0'} onChange={(e) => set('tax.rate', e.target.value)} />
                )}
                <Button onClick={() => save({ 'currency.base': settings['currency.base'] ?? 'BHD', 'tax.enabled': settings['tax.enabled'] ?? 'false', 'tax.rate': settings['tax.rate'] ?? '0', 'locale.language': settings['locale.language'] ?? 'en', 'locale.direction': settings['locale.direction'] ?? 'ltr' })} isLoading={saving} size="sm">
                  Save
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* ════════ APPEARANCE ════════ */}
        {tab === 'appearance' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Paintbrush className="h-4 w-4" /> Storefront Theme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-gray-500">
                Choose a color theme for your storefront. Changes apply immediately to all visitors.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => save({ 'theme.preset': theme.id })}
                    className={`group relative rounded-2xl border-2 overflow-hidden text-left transition-all hover:shadow-lg ${
                      selectedTheme === theme.id
                        ? 'border-blue-600 shadow-md ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Mini storefront preview */}
                    <div className="h-32 relative overflow-hidden" style={{ background: theme.hero }}>
                      {/* Fake nav */}
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: theme.primary }} />
                          <div className="h-1.5 w-10 rounded bg-white/40" />
                        </div>
                        <div className="flex gap-1">
                          <div className="h-1 w-4 rounded bg-white/30" />
                          <div className="h-1 w-4 rounded bg-white/30" />
                          <div className="h-1 w-4 rounded bg-white/30" />
                        </div>
                      </div>
                      {/* Hero content */}
                      <div className="px-3 pt-1">
                        <div className="h-2 w-20 rounded bg-white/80 mb-1.5" />
                        <div className="h-1.5 w-28 rounded bg-white/40 mb-3" />
                        <div className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: theme.primary, color: '#fff' }}>
                          Shop Now →
                        </div>
                      </div>
                      {/* Floating product cards */}
                      <div className="absolute bottom-2 right-3 flex gap-1.5">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-10 w-8 rounded-lg bg-white/10 border border-white/20 backdrop-blur-sm">
                            <div className="h-5 rounded-t-lg" style={{ backgroundColor: theme.accent + '40' }} />
                            <div className="px-1 pt-0.5">
                              <div className="h-1 w-full rounded bg-white/40" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Theme info */}
                    <div className="p-3 bg-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{theme.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{theme.desc}</p>
                        </div>
                        <div className="flex gap-1 items-center">
                          <div className="h-4 w-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: theme.primary }} />
                          <div className="h-3 w-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: theme.accent }} />
                        </div>
                      </div>
                      {selectedTheme === theme.id && (
                        <div className="mt-2 flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1">
                          <Check className="h-3 w-3 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-700">Active Theme</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  Theme changes are live immediately. Customers will see the new theme on their next page load.
                  The selected theme is saved automatically when you click a card.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ════════ LEGAL & TERMS ════════ */}
        {tab === 'legal' && (
          <>
            {!isSuperAdmin && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 flex gap-3">
                <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Super Admin Only</p>
                  <p className="text-xs text-amber-700 mt-0.5">Legal documents and terms acceptance settings can only be modified by a Super Admin.</p>
                </div>
              </div>
            )}

            {/* Terms enforcement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-blue-600" /> Terms Acceptance Enforcement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border-2 border-gray-200 p-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Require Terms Acceptance</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Visitors must accept your Terms & Conditions before using the store.
                      Denial suspends store access until they accept.
                    </p>
                  </div>
                  <Toggle
                    enabled={settings['legal.terms.required'] === 'true'}
                    onChange={(v) => set('legal.terms.required', String(v))}
                    danger
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                    <p className="text-2xl font-bold text-blue-700">{settings['legal.terms.version'] ?? '1'}</p>
                    <p className="text-xs text-blue-500 mt-0.5">Current Version</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                    <p className="text-2xl font-bold text-emerald-700">Auto</p>
                    <p className="text-xs text-emerald-500 mt-0.5">Version Bump on Save</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                    <p className="text-2xl font-bold text-amber-700">Cookie</p>
                    <p className="text-xs text-amber-500 mt-0.5">Acceptance Tracked</p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600 space-y-1">
                  <p><strong>How it works:</strong></p>
                  <p>• When a visitor first arrives, a full-screen terms modal appears</p>
                  <p>• If they accept → cookie <code className="bg-white px-1 rounded">terms_v{settings['legal.terms.version'] ?? '1'}</code> is set and they proceed</p>
                  <p>• If they deny → they are redirected to an &quot;Access Suspended&quot; page</p>
                  <p>• When you update the terms content, version auto-increments → all visitors must re-accept</p>
                  <p>• Super Admin can re-enable access from the admin panel</p>
                </div>
              </CardContent>
            </Card>

            {/* Terms & Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" /> Terms &amp; Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-500">Plain text or basic HTML. Displayed in the acceptance modal and at <code className="bg-gray-100 px-1 rounded">/terms</code></p>
                <textarea
                  rows={10}
                  disabled={!isSuperAdmin}
                  value={settings['legal.terms.content'] ?? ''}
                  onChange={(e) => set('legal.terms.content', e.target.value)}
                  placeholder="Enter your Terms and Conditions here..."
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 resize-y"
                />
              </CardContent>
            </Card>

            {/* Market Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Store className="h-4 w-4" /> Market Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-500">Marketplace-specific rules shown to sellers and buyers</p>
                <textarea
                  rows={8}
                  disabled={!isSuperAdmin}
                  value={settings['legal.market.content'] ?? ''}
                  onChange={(e) => set('legal.market.content', e.target.value)}
                  placeholder="Enter marketplace terms, seller agreements, buyer protections..."
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 resize-y"
                />
              </CardContent>
            </Card>

            {/* Privacy Policy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" /> Privacy Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-500">Displayed at <code className="bg-gray-100 px-1 rounded">/privacy</code></p>
                <textarea
                  rows={8}
                  disabled={!isSuperAdmin}
                  value={settings['legal.privacy.content'] ?? ''}
                  onChange={(e) => set('legal.privacy.content', e.target.value)}
                  placeholder="Enter your Privacy Policy here..."
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 resize-y"
                />
              </CardContent>
            </Card>

            {isSuperAdmin && (
              <div className="sticky bottom-4 z-10">
                <div className="rounded-2xl bg-white border border-gray-200 shadow-lg px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Save Legal Documents</p>
                    <p className="text-xs text-gray-500">If content changed, version will increment and all users must re-accept</p>
                  </div>
                  <Button onClick={saveLegal} isLoading={saving} className="gap-2">
                    <Check className="h-4 w-4" />
                    Save &amp; Publish
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════ FEATURES ════════ */}
        {tab === 'features' && (
          <>
            {!isSuperAdmin && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 flex gap-3">
                <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Super Admin Only</p>
                  <p className="text-xs text-amber-700 mt-0.5">Feature flags can only be changed by a Super Admin.</p>
                </div>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ToggleLeft className="h-4 w-4" /> Storefront Features
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-gray-50">
                {FEATURES.map((f) => {
                  const Icon = f.icon
                  const enabled = settings[f.key] !== 'false'
                  return (
                    <div key={f.key} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                      <div className={`rounded-xl p-2.5 ${enabled ? 'bg-blue-50' : 'bg-gray-100'}`}>
                        <Icon className={`h-4 w-4 ${enabled ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{f.label}</p>
                        <p className="text-xs text-gray-500">{f.desc}</p>
                        {f.danger && !enabled && (
                          <p className="text-xs text-red-600 mt-0.5 font-medium">⚠ Checkout is currently disabled — customers cannot place orders</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-semibold ${enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {enabled ? 'ON' : 'OFF'}
                        </span>
                        <Toggle
                          enabled={enabled}
                          onChange={(v) => {
                            if (!isSuperAdmin) return
                            set(f.key, String(v))
                            save({ [f.key]: String(v) })
                          }}
                          danger={f.danger}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-slate-800">About Feature Flags</p>
              <p>• Toggling a feature off removes it from the storefront immediately</p>
              <p>• Disabling <strong>Checkout</strong> prevents all new orders but keeps existing orders accessible</p>
              <p>• Disabling <strong>Cart</strong> shows products in browse-only mode</p>
              <p>• Changes take effect on the next page load for visitors</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
