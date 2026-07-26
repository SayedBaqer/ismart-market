'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { use } from 'react'
import {
  ArrowLeft, Building2, CheckCircle2, XCircle, Clock, ExternalLink,
  Package, ShoppingCart, Users, TrendingUp, Crown, Zap, Shield,
  Calendar, Phone, Mail, MapPin, Edit3, Save, Globe, AlertTriangle,
  ChevronRight, BarChart2, Activity, BadgeCheck, Sliders,
  UserCog, KeyRound, Trash2, Ban, Power, UserPlus, X,
} from 'lucide-react'

type ShopPlan = 'FREE' | 'STARTER' | 'BUSINESS' | 'ENTERPRISE'
type ShopStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
type PolicyMode = 'AUTO' | 'APPROVE'
type TrustLevel = 'BASIC' | 'VERIFIED' | 'TRUSTED' | 'PREMIUM'

const ACTIVITIES = ['products', 'categories', 'pageDesign', 'news', 'prices', 'promotions'] as const
type Activity = typeof ACTIVITIES[number]

const ACTIVITY_LABELS: Record<Activity, string> = {
  products: 'Products', categories: 'Categories', pageDesign: 'Page Design',
  news: 'News & Posts', prices: 'Prices', promotions: 'Promotions',
}

const TRUST_META: Record<TrustLevel, { label: string; color: string; bg: string; border: string }> = {
  BASIC:    { label: 'Basic',    color: 'text-gray-600',  bg: 'bg-gray-50',   border: 'border-gray-200' },
  VERIFIED: { label: 'Verified', color: 'text-blue-700',  bg: 'bg-blue-50',   border: 'border-blue-200' },
  TRUSTED:  { label: 'Trusted',  color: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-200' },
  PREMIUM:  { label: 'Premium',  color: 'text-amber-700', bg: 'bg-amber-50',  border: 'border-amber-200' },
}

interface ShopDetail {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  address: string | null
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  status: ShopStatus
  plan: ShopPlan
  planExpiry: string | null
  currency: string
  language: string
  createdAt: string
  settings: Record<string, unknown>
  _count: { products: number; orders: number; users: number; customers: number }
  revenue: number
  users: {
    id: string
    role: string
    user: { id: string; name: string | null; email: string; role: string; isActive: boolean }
  }[]
}

const PLAN_META = {
  FREE:       { label: 'Free',       icon: Users, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' },
  STARTER:    { label: 'Starter',    icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  BUSINESS:   { label: 'Business',   icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  ENTERPRISE: { label: 'Enterprise', icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
}

const STATUS_META = {
  PENDING:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700',  Icon: Clock },
  ACTIVE:    { label: 'Active',    cls: 'bg-green-100 text-green-700',  Icon: CheckCircle2 },
  SUSPENDED: { label: 'Suspended', cls: 'bg-red-100 text-red-700',     Icon: XCircle },
  CLOSED:    { label: 'Closed',    cls: 'bg-gray-100 text-gray-600',   Icon: XCircle },
}

const PLAN_LIMITS: Record<ShopPlan, { products: number; staff: number; orders: number }> = {
  FREE:       { products: 50,   staff: 2,  orders: 100 },
  STARTER:    { products: 200,  staff: 5,  orders: 500 },
  BUSINESS:   { products: 1000, staff: 20, orders: 5000 },
  ENTERPRISE: { products: 99999, staff: 999, orders: 99999 },
}

export default function ShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [shop, setShop] = useState<ShopDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editPlan, setEditPlan] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<ShopPlan>('FREE')
  const [planExpiry, setPlanExpiry] = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [showSuspend, setShowSuspend] = useState(false)

  // Shop info edit
  const [editInfo, setEditInfo] = useState(false)
  const [infoForm, setInfoForm] = useState({ name: '', description: '', email: '', phone: '', address: '' })
  const [savingInfo, setSavingInfo] = useState(false)

  // Team management
  const [resetPasswordFor, setResetPasswordFor] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [teamBusyId, setTeamBusyId] = useState<string | null>(null)
  const [teamError, setTeamError] = useState('')

  // Hard delete
  const [showHardDelete, setShowHardDelete] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Add team member
  const [showAddUser, setShowAddUser] = useState(false)
  const [addUserForm, setAddUserForm] = useState({ name: '', email: '', username: '', password: '', role: 'STAFF' })
  const [addingUser, setAddingUser] = useState(false)
  const [addUserError, setAddUserError] = useState('')

  // Approval policy state
  const [policy, setPolicy] = useState<{
    activities: Record<Activity, PolicyMode>
    trust: { level: TrustLevel }
  }>({
    activities: { products: 'APPROVE', categories: 'AUTO', pageDesign: 'APPROVE', news: 'APPROVE', prices: 'AUTO', promotions: 'APPROVE' },
    trust: { level: 'BASIC' },
  })
  const [editPolicy, setEditPolicy] = useState(false)
  const [savingPolicy, setSavingPolicy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [shopRes, policyRes] = await Promise.all([
        fetch(`/api/admin/shops/${id}`),
        fetch(`/api/admin/shops/${id}/policy`),
      ])
      if (shopRes.ok) {
        const data = await shopRes.json()
        setShop(data.shop)
        setSelectedPlan(data.shop.plan)
        setPlanExpiry(data.shop.planExpiry ? new Date(data.shop.planExpiry).toISOString().split('T')[0] : '')
        setInfoForm({
          name: data.shop.name ?? '',
          description: data.shop.description ?? '',
          email: data.shop.email ?? '',
          phone: data.shop.phone ?? '',
          address: data.shop.address ?? '',
        })
      }
      if (policyRes.ok) {
        const pd = await policyRes.json()
        setPolicy({
          activities: pd.policy?.activities ?? { products: 'APPROVE', categories: 'AUTO', pageDesign: 'APPROVE', news: 'APPROVE', prices: 'AUTO', promotions: 'APPROVE' },
          trust: pd.policy?.trust ?? { level: 'BASIC' },
        })
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  async function savePolicy() {
    setSavingPolicy(true)
    await fetch(`/api/admin/shops/${id}/policy`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activities: policy.activities, trust: policy.trust }),
    })
    await load()
    setEditPolicy(false)
    setSavingPolicy(false)
  }

  function toggleActivity(act: Activity) {
    setPolicy((prev) => ({
      ...prev,
      activities: { ...prev.activities, [act]: prev.activities[act] === 'AUTO' ? 'APPROVE' : 'AUTO' },
    }))
  }

  function setTrustLevel(level: TrustLevel) {
    setPolicy((prev) => ({ ...prev, trust: { ...prev.trust, level } }))
  }

  useEffect(() => { load() }, [load])

  async function savePlan() {
    if (!shop) return
    setSaving(true)
    await fetch(`/api/admin/shops/${id}/plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: selectedPlan, planExpiry: planExpiry || null }),
    })
    await load()
    setEditPlan(false)
    setSaving(false)
  }

  async function changeStatus(status: ShopStatus) {
    if (!shop) return
    setSaving(true)
    await fetch(`/api/admin/shops/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, suspendReason: status === 'SUSPENDED' ? suspendReason : undefined }),
    })
    await load()
    setShowSuspend(false)
    setSuspendReason('')
    setSaving(false)
  }

  async function saveInfo() {
    if (!infoForm.name.trim()) return
    setSavingInfo(true)
    await fetch(`/api/admin/shops/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(infoForm),
    })
    await load()
    setEditInfo(false)
    setSavingInfo(false)
  }

  async function toggleUserActive(shopUserId: string, current: boolean) {
    setTeamBusyId(shopUserId)
    setTeamError('')
    const res = await fetch(`/api/admin/shops/${id}/users/${shopUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    })
    if (!res.ok) { const d = await res.json(); setTeamError(d.error ?? 'Failed to update') }
    await load()
    setTeamBusyId(null)
  }

  async function resetUserPassword(shopUserId: string) {
    if (newPassword.length < 6) { setTeamError('Password must be at least 6 characters'); return }
    setTeamBusyId(shopUserId)
    setTeamError('')
    const res = await fetch(`/api/admin/shops/${id}/users/${shopUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    })
    if (!res.ok) { const d = await res.json(); setTeamError(d.error ?? 'Failed to reset password') }
    else { setResetPasswordFor(null); setNewPassword('') }
    setTeamBusyId(null)
  }

  async function removeTeamMember(shopUserId: string) {
    if (!confirm('Remove this account from the shop?')) return
    setTeamBusyId(shopUserId)
    setTeamError('')
    const res = await fetch(`/api/admin/shops/${id}/users/${shopUserId}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json(); setTeamError(d.error ?? 'Failed to remove') }
    await load()
    setTeamBusyId(null)
  }

  async function addTeamMember() {
    if (!addUserForm.email || !addUserForm.username || !addUserForm.password) {
      setAddUserError('Email, username and password are required')
      return
    }
    setAddingUser(true)
    setAddUserError('')
    const res = await fetch(`/api/admin/shops/${id}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addUserForm),
    })
    if (!res.ok) {
      const d = await res.json()
      setAddUserError(d.error ?? 'Failed to create account')
      setAddingUser(false)
      return
    }
    setAddUserForm({ name: '', email: '', username: '', password: '', role: 'STAFF' })
    setShowAddUser(false)
    await load()
    setAddingUser(false)
  }

  async function hardDeleteShop() {
    if (!shop || deleteConfirmText !== shop.name) return
    setDeleting(true)
    const res = await fetch(`/api/admin/shops/${id}?mode=hard`, { method: 'DELETE' })
    if (res.ok) {
      window.location.href = '/admin/shops'
    } else {
      const d = await res.json()
      alert(d.error ?? 'Failed to delete shop')
      setDeleting(false)
    }
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
    </div>
  )

  if (!shop) return (
    <div className="flex h-64 flex-col items-center justify-center text-center">
      <Building2 className="h-12 w-12 text-gray-300 mb-3" />
      <p className="text-gray-500 font-semibold">Shop not found</p>
      <Link href="/admin/shops" className="mt-3 text-sm text-blue-600 hover:underline">← Back to shops</Link>
    </div>
  )

  const statusMeta = STATUS_META[shop.status]
  const StatusIcon = statusMeta.Icon
  const planMeta = PLAN_META[shop.plan]
  const PlanIcon = planMeta.icon
  const limits = PLAN_LIMITS[shop.plan]
  const quotas = (shop.settings?.quotas ?? {}) as Record<string, number>

  const effectiveLimits = {
    products: quotas.products ?? limits.products,
    staff: quotas.staff ?? limits.staff,
    orders: quotas.orders ?? limits.orders,
  }

  function QuotaBar({ label, used, limit }: { label: string; used: number; limit: number }) {
    const pct = limit >= 99999 ? 5 : Math.min(100, Math.round((used / limit) * 100))
    const danger = pct >= 90
    return (
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-xs text-gray-600">{label}</span>
          <span className={`text-xs font-semibold ${danger ? 'text-red-600' : 'text-gray-700'}`}>
            {used} / {limit >= 99999 ? '∞' : limit}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${danger ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gray-50/50 pb-12">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <Link href="/admin/shops" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Shops
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
        <span className="text-sm font-semibold text-gray-900">{shop.name}</span>
        <div className="ml-auto flex items-center gap-2">
          <a href={`/shops/${shop.slug}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
            <ExternalLink className="h-3 w-3" /> View Public Page
          </a>
          <Link href={`/admin/shops/approvals`}
            className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-100">
            <CheckCircle2 className="h-3 w-3" /> Approvals
          </Link>
        </div>
      </div>

      {/* Shop hero */}
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
        {shop.bannerUrl && (
          <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${shop.bannerUrl})` }} />
        )}
        <div className="relative px-6 py-8">
          <div className="flex items-start gap-4">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-white/20 shadow-xl text-2xl font-black text-white ${planMeta.bg.replace('bg-', 'bg-')}`}
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              {shop.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shop.logoUrl} alt={shop.name} className="h-full w-full rounded-xl object-cover" />
              ) : shop.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-black text-white">{shop.name}</h1>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${statusMeta.cls}`}>
                  <StatusIcon className="h-3 w-3" />{statusMeta.label}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${planMeta.bg} ${planMeta.color} ${planMeta.border}`}>
                  <PlanIcon className="h-3 w-3" />{planMeta.label}
                </span>
              </div>
              <p className="font-mono text-sm text-slate-400">/{shop.slug}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                {shop.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{shop.email}</span>}
                {shop.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{shop.phone}</span>}
                {shop.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{shop.address}</span>}
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Since {new Date(shop.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{shop.currency} · {shop.language}</span>
              </div>
            </div>
          </div>

          {/* Metric strip */}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Products', value: shop._count.products, icon: Package },
              { label: 'Orders', value: shop._count.orders, icon: ShoppingCart },
              { label: 'Staff', value: shop._count.users, icon: Users },
              { label: 'Revenue', value: `${(shop.revenue ?? 0).toFixed(3)} ${shop.currency}`, icon: TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <Icon className="h-3.5 w-3.5 text-slate-400 mb-1" />
                <p className="text-lg font-extrabold text-white truncate">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Plan Management */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50">
                  <Crown className="h-4 w-4 text-violet-600" />
                </div>
                <p className="font-semibold text-gray-900">Plan & Subscription</p>
              </div>
              <button type="button" onClick={() => setEditPlan(!editPlan)}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                <Edit3 className="h-3 w-3" />{editPlan ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editPlan ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {(['FREE', 'STARTER', 'BUSINESS', 'ENTERPRISE'] as ShopPlan[]).map((p) => {
                    const m = PLAN_META[p]
                    const Icon = m.icon
                    return (
                      <button key={p} type="button" onClick={() => setSelectedPlan(p)}
                        className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${selectedPlan === p ? `${m.border} ${m.bg}` : 'border-gray-100 hover:border-gray-200'}`}>
                        <Icon className={`h-4 w-4 ${m.color} shrink-0`} />
                        <span className={`text-sm font-semibold ${selectedPlan === p ? m.color : 'text-gray-700'}`}>{m.label}</span>
                      </button>
                    )
                  })}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Plan Expiry (leave empty for no expiry)</label>
                  <input type="date" value={planExpiry} onChange={(e) => setPlanExpiry(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <button type="button" onClick={savePlan} disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
                  <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Plan'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className={`flex items-center gap-3 rounded-xl border ${planMeta.border} ${planMeta.bg} px-4 py-3`}>
                  <PlanIcon className={`h-5 w-5 ${planMeta.color}`} />
                  <div>
                    <p className={`font-bold ${planMeta.color}`}>{planMeta.label} Plan</p>
                    {shop.planExpiry ? (
                      <p className="text-xs text-gray-500">Expires {new Date(shop.planExpiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    ) : (
                      <p className="text-xs text-gray-400">No expiry set</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <QuotaBar label="Products" used={shop._count.products} limit={effectiveLimits.products} />
                  <QuotaBar label="Staff Members" used={shop._count.users} limit={effectiveLimits.staff} />
                  <QuotaBar label="Orders" used={shop._count.orders} limit={effectiveLimits.orders} />
                </div>
              </div>
            )}
          </div>

          {/* Status & Controls */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
              <p className="font-semibold text-gray-900">Shop Controls</p>
            </div>

            <div className="space-y-3">
              {/* Current status */}
              <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${statusMeta.cls}`}>
                <StatusIcon className="h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-bold">{statusMeta.label}</p>
                  <p className="text-xs opacity-70">Current shop status</p>
                </div>
              </div>

              {/* Quick actions */}
              <div className="space-y-2">
                {shop.status === 'PENDING' && (
                  <button type="button" onClick={() => changeStatus('ACTIVE')} disabled={saving}
                    className="flex w-full items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" /> Approve & Activate Shop
                  </button>
                )}
                {shop.status === 'ACTIVE' && !showSuspend && (
                  <button type="button" onClick={() => setShowSuspend(true)}
                    className="flex w-full items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-100">
                    <AlertTriangle className="h-4 w-4" /> Suspend Shop
                  </button>
                )}
                {showSuspend && (
                  <div className="space-y-2">
                    <input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}
                      placeholder="Reason for suspension (shown to shop owner)"
                      className="w-full rounded-xl border border-orange-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => changeStatus('SUSPENDED')} disabled={saving}
                        className="flex-1 rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
                        {saving ? 'Suspending…' : 'Confirm Suspend'}
                      </button>
                      <button type="button" onClick={() => setShowSuspend(false)} className="text-sm text-gray-500 px-3">Cancel</button>
                    </div>
                  </div>
                )}
                {shop.status === 'SUSPENDED' && (
                  <button type="button" onClick={() => changeStatus('ACTIVE')} disabled={saving}
                    className="flex w-full items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" /> Reactivate Shop
                  </button>
                )}
              </div>

              {/* Navigation links */}
              <div className="pt-2 space-y-1 border-t border-gray-100">
                {[
                  { label: 'View Pending Approvals', href: '/admin/shops/approvals', icon: Activity },
                  { label: 'View All Orders', href: '/admin/orders', icon: ShoppingCart },
                  { label: 'Platform Overview', href: '/admin/platform', icon: BarChart2 },
                ].map(({ label, href, icon: Icon }) => (
                  <Link key={href} href={href} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                    <Icon className="h-4 w-4 text-gray-400" />
                    {label}
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-gray-300" />
                  </Link>
                ))}
              </div>

              {/* Danger zone */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <p className="text-xs font-semibold text-red-600 mb-1">Danger Zone</p>
                {shop.status !== 'CLOSED' && (
                  <button type="button" onClick={() => { if (confirm('Close this shop? It can be reactivated later.')) changeStatus('CLOSED') }} disabled={saving}
                    className="flex w-full items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
                    <XCircle className="h-4 w-4" /> Close Shop
                  </button>
                )}
                {!showHardDelete ? (
                  <button type="button" onClick={() => setShowHardDelete(true)}
                    className="flex w-full items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                    <Trash2 className="h-4 w-4" /> Delete Shop Permanently
                  </button>
                ) : (
                  <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-xs text-red-700">
                      This permanently deletes the shop, its team, and branches. Products, orders and documents
                      are preserved but detached from this shop. This cannot be undone.
                    </p>
                    <p className="text-xs font-semibold text-red-700">Type the shop name (&quot;{shop.name}&quot;) to confirm:</p>
                    <input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                    <div className="flex gap-2">
                      <button type="button" onClick={hardDeleteShop} disabled={deleting || deleteConfirmText !== shop.name}
                        className="flex-1 rounded-xl bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-40">
                        {deleting ? 'Deleting…' : 'Confirm Permanent Delete'}
                      </button>
                      <button type="button" onClick={() => { setShowHardDelete(false); setDeleteConfirmText('') }} className="text-sm text-gray-500 px-3">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Shop Info */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50">
                <Edit3 className="h-4 w-4 text-teal-600" />
              </div>
              <p className="font-semibold text-gray-900">Shop Info</p>
            </div>
            <button type="button" onClick={() => setEditInfo(!editInfo)}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
              <Edit3 className="h-3 w-3" />{editInfo ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editInfo ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">Shop Name</label>
                <input value={infoForm.name} onChange={(e) => setInfoForm((v) => ({ ...v, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Description</label>
                <textarea value={infoForm.description} onChange={(e) => setInfoForm((v) => ({ ...v, description: e.target.value }))} rows={2}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Email</label>
                  <input value={infoForm.email} onChange={(e) => setInfoForm((v) => ({ ...v, email: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Phone</label>
                  <input value={infoForm.phone} onChange={(e) => setInfoForm((v) => ({ ...v, phone: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Address</label>
                <input value={infoForm.address} onChange={(e) => setInfoForm((v) => ({ ...v, address: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <button type="button" onClick={saveInfo} disabled={savingInfo}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                <Save className="h-4 w-4" />{savingInfo ? 'Saving…' : 'Save Info'}
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 text-sm text-gray-600">
              <p><span className="font-semibold text-gray-800">{shop.name}</span></p>
              {shop.description && <p className="text-gray-500">{shop.description}</p>}
              {shop.email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-gray-400" />{shop.email}</p>}
              {shop.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gray-400" />{shop.phone}</p>}
              {shop.address && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gray-400" />{shop.address}</p>}
            </div>
          )}
        </div>

        {/* Shop Team */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
                <UserCog className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Shop Team</p>
                <p className="text-xs text-gray-400">Owner &amp; staff accounts — add, deactivate, reset password, or remove</p>
              </div>
            </div>
            <button type="button" onClick={() => { setShowAddUser(!showAddUser); setAddUserError('') }}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
              {showAddUser ? <X className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
              {showAddUser ? 'Cancel' : 'Add Account'}
            </button>
          </div>

          {showAddUser && (
            <div className="mb-4 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              {addUserError && <p className="text-xs text-red-600">{addUserError}</p>}
              <div className="grid grid-cols-2 gap-2">
                <select value={addUserForm.role} onChange={(e) => setAddUserForm((v) => ({ ...v, role: e.target.value }))}
                  className="col-span-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="MANAGER">Owner (Manager)</option>
                  <option value="STAFF">Sales Staff</option>
                  <option value="CASHIER">Delivery Staff</option>
                </select>
                <input placeholder="Name" value={addUserForm.name} onChange={(e) => setAddUserForm((v) => ({ ...v, name: e.target.value }))}
                  className="col-span-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                <input placeholder="Email" value={addUserForm.email} onChange={(e) => setAddUserForm((v) => ({ ...v, email: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                <input placeholder="Username" value={addUserForm.username} onChange={(e) => setAddUserForm((v) => ({ ...v, username: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                <input type="password" placeholder="Password (min 8 chars)" value={addUserForm.password} onChange={(e) => setAddUserForm((v) => ({ ...v, password: e.target.value }))}
                  className="col-span-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <button type="button" onClick={addTeamMember} disabled={addingUser}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                <UserPlus className="h-3.5 w-3.5" /> {addingUser ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          )}

          {teamError && <p className="mb-2 text-xs text-red-600">{teamError}</p>}

          <div className="space-y-2">
            {shop.users.map((su) => {
              const busy = teamBusyId === su.id
              const resetting = resetPasswordFor === su.id
              return (
                <div key={su.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{su.user.name ?? 'Unnamed'}</p>
                      <p className="text-xs text-gray-500 truncate">{su.user.email} · {su.role}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${su.user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                        {su.user.isActive ? 'ACTIVE' : 'DISABLED'}
                      </span>
                      <button type="button" disabled={busy} onClick={() => toggleUserActive(su.id, su.user.isActive)}
                        title={su.user.isActive ? 'Disable account' : 'Enable account'}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50">
                        {su.user.isActive ? <Ban className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </button>
                      <button type="button" disabled={busy} onClick={() => { setResetPasswordFor(resetting ? null : su.id); setNewPassword('') }}
                        title="Reset password" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" disabled={busy} onClick={() => removeTeamMember(su.id)}
                        title="Remove from shop" className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {resetting && (
                    <div className="mt-2 flex gap-2">
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min 6 chars)"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                      <button type="button" onClick={() => resetUserPassword(su.id)} disabled={busy}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                        {busy ? '…' : 'Set'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {shop.users.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">No accounts linked to this shop</p>
            )}
          </div>
        </div>

        {/* Approval Policy */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50">
                <Sliders className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Approval Policy</p>
                <p className="text-xs text-gray-400">Control which shop activities require super admin review</p>
              </div>
            </div>
            <button type="button" onClick={() => setEditPolicy(!editPolicy)}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
              <Edit3 className="h-3 w-3" />{editPolicy ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {/* Trust Level */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Trust Level</p>
            {editPolicy ? (
              <div className="grid grid-cols-4 gap-2">
                {(['BASIC', 'VERIFIED', 'TRUSTED', 'PREMIUM'] as TrustLevel[]).map((lvl) => {
                  const m = TRUST_META[lvl]
                  const active = policy.trust.level === lvl
                  return (
                    <button key={lvl} type="button" onClick={() => setTrustLevel(lvl)}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 py-2.5 text-xs font-semibold transition-all ${active ? `${m.border} ${m.bg} ${m.color}` : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}>
                      <BadgeCheck className={`h-4 w-4 ${active ? m.color : 'text-gray-300'}`} />
                      {m.label}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold ${TRUST_META[policy.trust.level].bg} ${TRUST_META[policy.trust.level].color} ${TRUST_META[policy.trust.level].border}`}>
                <BadgeCheck className="h-4 w-4" />
                {TRUST_META[policy.trust.level].label}
              </div>
            )}
          </div>

          {/* Per-activity toggles */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Activity Policies</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {ACTIVITIES.map((act) => {
                const isAuto = policy.activities[act] === 'AUTO'
                return (
                  <div key={act} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors ${isAuto ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{ACTIVITY_LABELS[act]}</p>
                      <p className={`text-xs font-medium ${isAuto ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {isAuto ? 'Auto-publish' : 'Needs approval'}
                      </p>
                    </div>
                    {editPolicy ? (
                      <button type="button" onClick={() => toggleActivity(act)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isAuto ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${isAuto ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    ) : (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${isAuto ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isAuto ? 'AUTO' : 'REVIEW'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {editPolicy && (
            <button type="button" onClick={savePolicy} disabled={savingPolicy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              <Save className="h-4 w-4" />{savingPolicy ? 'Saving…' : 'Save Policy'}
            </button>
          )}
        </div>

        {/* Description / Notes */}
        {shop.description && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">About This Shop</p>
            <p className="text-sm text-gray-700 leading-relaxed">{shop.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}
