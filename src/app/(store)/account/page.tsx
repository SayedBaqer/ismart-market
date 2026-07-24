'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  User, ShoppingBag, LogOut, LayoutDashboard, Store,
  Loader2, ChevronRight, Package, CheckCircle2, Clock,
  XCircle, Truck,
} from 'lucide-react'

import Link from 'next/link'
import { useStoreT } from '@/lib/i18n/store-context'

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderRow {
  id: string
  orderNumber: string
  status: string
  grandTotal: number
  currency: string
  createdAt: string
  shop: { name: string; logoUrl?: string | null }
  firstItem?: string | null
}

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; labelAr: string; color: string; Icon: React.ElementType }> = {
  PENDING:          { label: 'Pending',           labelAr: 'قيد الانتظار',     color: 'bg-amber-100 text-amber-700',   Icon: Clock },
  CONFIRMED:        { label: 'Confirmed',          labelAr: 'مؤكد',             color: 'bg-blue-100 text-blue-700',     Icon: CheckCircle2 },
  READY:            { label: 'Ready',              labelAr: 'جاهز',             color: 'bg-purple-100 text-purple-700', Icon: Package },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',   labelAr: 'في الطريق',        color: 'bg-indigo-100 text-indigo-700', Icon: Truck },
  DELIVERED:        { label: 'Delivered',          labelAr: 'تم التسليم',       color: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
  CANCELLED:        { label: 'Cancelled',          labelAr: 'ملغى',             color: 'bg-red-100 text-red-700',       Icon: XCircle },
}

function StatusBadge({ status, lang }: { status: string; lang: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, labelAr: status, color: 'bg-gray-100 text-gray-600', Icon: Clock }
  const label = lang === 'ar' ? cfg.labelAr : cfg.label
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
      <cfg.Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

// ── Sign-in form ───────────────────────────────────────────────────────────────

function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useStoreT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await signIn('credentials', {
      redirect: false,
      identifier: email,
      password,
    })
    setLoading(false)
    if (result?.ok) {
      onSuccess()
    } else {
      setError(t.invalidCredentials)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" dir={t.dir}>
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t.emailLabel}</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t.passwordLabel}</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t.signInBtn}
      </button>
    </form>
  )
}

// ── Register form ──────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useStoreT()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError(t.passwordTooShort); return }
    if (password !== confirm) { setError(t.passwordMismatch); return }
    setLoading(true)

    const res = await fetch('/api/store/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error === 'email_taken' ? t.emailTaken : t.error)
      setLoading(false)
      return
    }

    // Auto sign-in after registration
    await signIn('credentials', { redirect: false, identifier: email, password })
    setLoading(false)
    onSuccess()
  }

  return (
    <form onSubmit={submit} className="space-y-4" dir={t.dir}>
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t.nameLabel}</label>
        <input
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t.emailLabel}</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t.passwordLabel}</label>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t.confirmPasswordLabel}</label>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t.registerBtn}
      </button>
    </form>
  )
}

// ── Guest view (not signed in) ─────────────────────────────────────────────────

function GuestView() {
  const t = useStoreT()
  const router = useRouter()
  const [tab, setTab] = useState<'signin' | 'register'>('signin')

  function onSuccess() {
    router.refresh()
    window.location.reload()
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-10" dir={t.dir}>
      {/* Icon + title */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
          <User className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t.accountTitle}</h1>
      </div>

      {/* Tab switcher */}
      <div className="mb-6 flex rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab('signin')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            tab === 'signin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.signInTab}
        </button>
        <button
          type="button"
          onClick={() => setTab('register')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            tab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.registerTab}
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        {tab === 'signin' ? (
          <>
            <SignInForm onSuccess={onSuccess} />
            <p className="mt-5 text-center text-xs text-gray-400">
              {t.dontHaveAccount}{' '}
              <button type="button" onClick={() => setTab('register')} className="text-blue-600 font-semibold hover:underline">
                {t.registerTab}
              </button>
            </p>
          </>
        ) : (
          <>
            <RegisterForm onSuccess={onSuccess} />
            <p className="mt-5 text-center text-xs text-gray-400">
              {t.alreadyHaveAccount}{' '}
              <button type="button" onClick={() => setTab('signin')} className="text-blue-600 font-semibold hover:underline">
                {t.signInTab}
              </button>
            </p>
          </>
        )}
      </div>

      {/* Open a shop CTA */}
      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-200">
          <Store className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">
            {t.lang === 'ar' ? 'هل تريد فتح متجرك؟' : 'Want to open your shop?'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {t.lang === 'ar' ? 'ابدأ مجاناً — 1 مبيعات + 1 توصيل مجاناً' : 'Start free — 1 sales + 1 delivery included'}
          </p>
        </div>
        <Link
          href="/shop/wizard"
          className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
        >
          {t.lang === 'ar' ? 'ابدأ الآن' : 'Start Now'}
        </Link>
      </div>

    </div>
  )
}

// ── Admin / Staff redirect view ────────────────────────────────────────────────

function StaffView({ role, name }: { role: string; name?: string | null }) {
  const t = useStoreT()
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role)

  return (
    <div className="mx-auto max-w-sm px-4 py-10" dir={t.dir}>
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
          {isAdmin ? <LayoutDashboard className="h-8 w-8 text-white" /> : <Store className="h-8 w-8 text-white" />}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t.welcomeBack}
          </p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">{name ?? 'User'}</h2>
          <p className="mt-2 text-sm text-gray-500">
            {isAdmin ? t.adminAccountNote : t.shopAccountNote}
          </p>
        </div>
        <Link
          href={isAdmin ? '/admin' : '/shop'}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          {isAdmin ? t.goToAdmin : t.goToShop}
          <ChevronRight className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t.signOutBtn}
        </button>
      </div>
    </div>
  )
}

// ── Customer dashboard ─────────────────────────────────────────────────────────

function CustomerDashboard({ name, email }: { name?: string | null; email: string }) {
  const t = useStoreT()
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    fetch('/api/orders/my')
      .then(r => r.ok ? r.json() : { orders: [] })
      .then(d => { setOrders(d.orders ?? []); setLoadingOrders(false) })
      .catch(() => setLoadingOrders(false))
  }, [])

  return (
    <div className="mx-auto max-w-lg px-4 py-6" dir={t.dir}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold text-lg">
            {(name ?? email).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-gray-400">{t.welcomeBack}</p>
            <h1 className="text-lg font-bold text-gray-900">{name ?? email}</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          {t.signOutBtn}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex rounded-xl bg-gray-100 p-1">
        {(['orders', 'profile'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {tab === 'orders' ? t.myOrdersTab : t.myProfileTab}
          </button>
        ))}
      </div>

      {/* Orders tab */}
      {activeTab === 'orders' && (
        <div className="space-y-3">
          {loadingOrders ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <ShoppingBag className="h-14 w-14 text-gray-200 mb-3" />
              <p className="font-semibold text-gray-500">{t.noOrdersYet}</p>
              <p className="text-sm text-gray-400 mt-1">{t.noOrdersHint}</p>
              <Link
                href="/products"
                className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                {t.browseAll}
              </Link>
            </div>
          ) : (
            orders.map((o) => (
              <Link
                key={o.id}
                href={`/track?order=${o.orderNumber}`}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-gray-700">{o.orderNumber}</span>
                    <StatusBadge status={o.status} lang={t.lang} />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400 truncate">
                    {o.shop.name}{o.firstItem ? ` · ${o.firstItem}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{o.grandTotal.toFixed(3)} {o.currency}</p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(o.createdAt).toLocaleDateString(t.lang === 'ar' ? 'ar-BH' : 'en-BH')}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
              </Link>
            ))
          )}
        </div>
      )}

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t.nameLabel}</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{name ?? '—'}</p>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t.emailLabel}</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{email}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <GuestView />
  }

  const role = session!.user.role
  const isCustomer = role === 'CUSTOMER'

  if (!isCustomer) {
    return <StaffView role={role} name={session!.user.name} />
  }

  return (
    <CustomerDashboard
      name={session!.user.name}
      email={session!.user.email}
    />
  )
}
