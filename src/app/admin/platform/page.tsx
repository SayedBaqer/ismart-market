'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Globe, Building2, TrendingUp, Clock, Zap, Crown, RefreshCw,
  Megaphone, CheckCircle2, Package, ShoppingCart, Users, Star,
  Puzzle, Lock, ChevronRight, Activity, BarChart2, Store,
} from 'lucide-react'

interface PlatformStats {
  totalShops: number
  activeShops: number
  pendingShops: number
  planDistribution: { plan: string; count: number }[]
  leaderboard: { shopId: string; shopName: string; shopSlug: string; logoUrl: string | null; revenue: number; orders: number }[]
  recentActivity: { id: string; orderNumber: string; status: string; grandTotal: unknown; currency: string; createdAt: string; shop: { name: string; slug: string } | null; customerName: string | null }[]
}

const PLAN_META: Record<string, { label: string; color: string; bar: string; Icon: React.ComponentType<{ className?: string }> }> = {
  FREE:       { label: 'Free',       color: 'text-gray-600',   bar: 'bg-gray-300',    Icon: Users },
  STARTER:    { label: 'Starter',    color: 'text-blue-600',   bar: 'bg-blue-400',    Icon: Zap },
  BUSINESS:   { label: 'Business',   color: 'text-violet-600', bar: 'bg-violet-500',  Icon: TrendingUp },
  ENTERPRISE: { label: 'Enterprise', color: 'text-amber-600',  bar: 'bg-amber-500',   Icon: Crown },
}

const ORDER_STATUS_CLS: Record<string, string> = {
  PENDING:    'bg-amber-100 text-amber-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  SHIPPED:    'bg-indigo-100 text-indigo-700',
  COMPLETED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-700',
}

// Plugin registry — foundation for subscription marketplace
const PLUGIN_REGISTRY = [
  { id: 'loyalty', name: 'Loyalty Points', desc: 'Reward customers with points on every purchase', icon: Star, status: 'coming_soon', plan: 'STARTER' },
  { id: 'sms',     name: 'SMS Notifications', desc: 'Auto-send order updates via SMS gateway', icon: Megaphone, status: 'coming_soon', plan: 'STARTER' },
  { id: 'analytics', name: 'Advanced Analytics', desc: 'Deep insights, cohort analysis, revenue forecasts', icon: BarChart2, status: 'coming_soon', plan: 'BUSINESS' },
  { id: 'whatsapp', name: 'WhatsApp Integration', desc: 'Order notifications and customer chat via WhatsApp', icon: Activity, status: 'coming_soon', plan: 'BUSINESS' },
  { id: 'multi-currency', name: 'Multi-Currency', desc: 'Accept payments in multiple currencies with auto conversion', icon: Globe, status: 'coming_soon', plan: 'ENTERPRISE' },
  { id: 'api-access', name: 'API Access', desc: 'Full REST API access for third-party integrations', icon: Puzzle, status: 'coming_soon', plan: 'ENTERPRISE' },
]

export default function PlatformPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [announcement, setAnnouncement] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/platform')
      if (res.ok) setStats(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function sendAnnouncement() {
    if (!announcement.trim()) return
    setSending(true)
    // Stores in settings.value for 'platform.announcement'
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'platform.announcement': announcement.trim() }),
    })
    setSent(true)
    setTimeout(() => setSent(false), 3000)
    setSending(false)
  }

  const totalPlan = stats?.planDistribution.reduce((a, p) => a + p.count, 0) || 1

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-6 py-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        </div>
        <div className="relative flex items-center justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-300">
              <Globe className="h-3 w-3" /> Platform Control Center
            </div>
            <h1 className="text-2xl font-black text-white">iSmart Market</h1>
            <p className="mt-1 text-sm text-slate-400">Super admin oversight · All shops · All activity</p>
          </div>
          <button type="button" onClick={load} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* Platform stat strip */}
        <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Shops', value: stats?.totalShops ?? 0, icon: Building2, color: 'text-blue-400' },
            { label: 'Active Shops', value: stats?.activeShops ?? 0, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Pending Approval', value: stats?.pendingShops ?? 0, icon: Clock, color: 'text-amber-400' },
            { label: 'Revenue Leaders', value: stats?.leaderboard.length ?? 0, icon: TrendingUp, color: 'text-violet-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
              <Icon className={`h-4 w-4 mb-1.5 ${color}`} />
              <p className="text-2xl font-extrabold text-white">{value}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Plan Distribution */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50">
                <BarChart2 className="h-4 w-4 text-violet-600" />
              </div>
              <p className="font-semibold text-gray-900">Plan Distribution</p>
            </div>
            <div className="space-y-3">
              {['FREE', 'STARTER', 'BUSINESS', 'ENTERPRISE'].map((plan) => {
                const count = stats?.planDistribution.find((p) => p.plan === plan)?.count ?? 0
                const pct = Math.round((count / totalPlan) * 100)
                const meta = PLAN_META[plan]
                const Icon = meta.Icon
                return (
                  <div key={plan}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                        <span className="text-xs font-semibold text-gray-700">{meta.label}</span>
                      </div>
                      <span className="text-xs text-gray-500">{count} shop{count !== 1 ? 's' : ''} · {pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${meta.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <Link href="/admin/shops" className="mt-4 flex items-center gap-1 text-xs text-blue-600 hover:underline">
              Manage all shops <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Revenue Leaderboard */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
                <Crown className="h-4 w-4 text-amber-600" />
              </div>
              <p className="font-semibold text-gray-900">Top Shops by Revenue</p>
            </div>
            {!stats?.leaderboard.length ? (
              <p className="text-sm text-gray-400 text-center py-6">No sales data yet</p>
            ) : (
              <div className="space-y-2">
                {stats.leaderboard.map((s, i) => (
                  <Link key={s.shopId} href={`/admin/shops/${s.shopId}`}
                    className="flex items-center gap-3 rounded-xl p-2 hover:bg-gray-50 transition-colors group">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'
                    }`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{s.shopName}</p>
                      <p className="text-xs text-gray-400">{s.orders} orders</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-700 shrink-0">{s.revenue.toFixed(3)} BHD</p>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Platform Announcement */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
                <Megaphone className="h-4 w-4 text-blue-600" />
              </div>
              <p className="font-semibold text-gray-900">Platform Announcement</p>
            </div>
            <p className="mb-3 text-xs text-gray-500">Broadcast a message to all shop owners — appears in their portal dashboard.</p>
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              rows={4}
              placeholder="e.g. Platform maintenance on Saturday 10pm–12am. Orders will still be processed."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
            <button
              type="button"
              onClick={sendAnnouncement}
              disabled={sending || !announcement.trim()}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Megaphone className="h-4 w-4" />
              {sending ? 'Sending…' : sent ? '✓ Sent to all shops!' : 'Broadcast to All Shops'}
            </button>
          </div>
        </div>

        {/* Recent Marketplace Activity */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50">
                <Activity className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="font-semibold text-gray-900">Live Marketplace Orders</p>
            </div>
            <Link href="/admin/orders" className="text-xs text-blue-600 hover:underline">View all →</Link>
          </div>
          {!stats?.recentActivity.length ? (
            <div className="py-10 text-center text-sm text-gray-400">No activity yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats.recentActivity.map((o) => (
                <div key={o.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <ShoppingCart className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-700">#{o.orderNumber}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ORDER_STATUS_CLS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                      {o.shop && <span className="flex items-center gap-1 text-xs text-gray-400"><Store className="h-3 w-3" />{o.shop.name}</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{o.customerName ?? 'Guest'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-gray-900">{Number(o.grandTotal).toFixed(3)} {o.currency}</p>
                    <p className="text-[11px] text-gray-400">{new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plugin Marketplace */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600">
                <Puzzle className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Plugin Marketplace</p>
                <p className="text-xs text-gray-400">Subscription services for shops — coming soon</p>
              </div>
            </div>
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
              Roadmap
            </span>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {PLUGIN_REGISTRY.map((plugin) => {
              const Icon = plugin.icon
              const planMeta = PLAN_META[plugin.plan]
              return (
                <div key={plugin.id}
                  className="relative flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 opacity-80">
                  <div className="absolute top-3 right-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                      Soon
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm">
                      <Icon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{plugin.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Lock className="h-2.5 w-2.5 text-gray-400" />
                        <span className={`text-[10px] font-semibold ${planMeta.color}`}>{planMeta.label}+</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{plugin.desc}</p>
                </div>
              )
            })}
          </div>
          <div className="border-t border-gray-100 px-5 py-4 bg-gradient-to-r from-violet-50/50 to-blue-50/50">
            <p className="text-xs text-gray-500">
              Plugins will be available as per-shop subscriptions billed monthly. Shop owners choose what they need.
              Configure plugin access per plan in <Link href="/admin/settings" className="text-blue-600 hover:underline">Settings</Link>.
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Manage Shops', href: '/admin/shops', icon: Building2, color: 'bg-blue-600' },
            { label: 'Shop Approvals', href: '/admin/shops/approvals', icon: CheckCircle2, color: 'bg-amber-600' },
            { label: 'Store Builder', href: '/admin/store', icon: Store, color: 'bg-violet-600' },
            { label: 'Settings', href: '/admin/settings', icon: Package, color: 'bg-slate-700' },
          ].map(({ label, href, icon: Icon, color }) => (
            <Link key={label} href={href}
              className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <ChevronRight className="ml-auto h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
