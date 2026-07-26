'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import {
  Store, MapPin, Percent, Package, Rocket, ChevronRight, ChevronLeft,
  Check, AlertCircle, Loader2, Eye, EyeOff, User, Crown, ShoppingCart, Truck,
} from 'lucide-react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 0 — account (skipped if logged in)
  ownerName: string; ownerEmail: string; ownerPassword: string; ownerConfirm: string
  // Step 1 — shop basics
  name: string; slug: string; description: string
  // Step 2 — contact
  email: string; phone: string; address: string; currency: string
  // Step 3 — tax
  taxEnabled: boolean; taxRate: string; taxInclusive: boolean; taxLabel: string; taxNumber: string
  // Step 4 — first product (optional)
  productName: string; productPrice: string; productDesc: string
}

const EMPTY: FormData = {
  ownerName: '', ownerEmail: '', ownerPassword: '', ownerConfirm: '',
  name: '', slug: '', description: '',
  email: '', phone: '', address: '', currency: 'BHD',
  taxEnabled: false, taxRate: '10', taxInclusive: false, taxLabel: 'VAT', taxNumber: '',
  productName: '', productPrice: '', productDesc: '',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

function inp(err?: string) {
  return `w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${err ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {children}
      {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}
    </div>
  )
}

function Card({ icon: Icon, title, desc, children }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-black text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{desc}</p>
        </div>
      </div>
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-4">
        {children}
      </div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <p className="text-xs font-semibold text-gray-400 w-28 shrink-0 pt-0.5">{label}</p>
      <p className="text-sm text-gray-900 font-medium">{value}</p>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function OpenShopPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const isLoggedIn = status === 'authenticated'
  const isLoading = status === 'loading'

  // firstStep is always 0 — STEPS array itself excludes the account step when logged in
  const firstStep = 0

  const STEPS = [
    ...(isLoggedIn ? [] : [{ icon: User,    label: 'Your Account', desc: 'Create your free account' }]),
    { icon: Store,   label: 'Shop Info',    desc: 'Name & identity' },
    { icon: MapPin,  label: 'Contact',      desc: 'Location & reach' },
    { icon: Percent, label: 'Tax',          desc: 'Optional tax settings' },
    { icon: Package, label: 'First Product',desc: 'Optional starter' },
    { icon: Rocket,  label: 'Launch',       desc: 'Submit for review' },
  ]

  const [step, setStep] = useState(firstStep)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'general', string>>>({})
  const [slugTaken, setSlugTaken] = useState(false)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showSlug, setShowSlug] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // Pre-fill email from session if logged in
  useEffect(() => {
    if (session?.user?.email && !form.email) {
      setForm(f => ({ ...f, email: f.email || session.user.email || '' }))
    }
  }, [session])

  // Sync first step when auth status resolves
  useEffect(() => {
    if (!isLoading) setStep(firstStep)
  }, [isLoading])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: undefined, general: undefined }))
    if (key === 'name' && !showSlug) {
      setForm(f => ({ ...f, name: value as string, slug: slugify(value as string) }))
      setSlugTaken(false)
    }
    if (key === 'slug') setSlugTaken(false)
  }

  async function checkSlug(s: string) {
    if (!s) return
    setCheckingSlug(true)
    try {
      const res = await fetch(`/api/shops/check-slug?slug=${encodeURIComponent(s)}`)
      const d = await res.json()
      setSlugTaken(Boolean(d.taken))
    } finally {
      setCheckingSlug(false)
    }
  }

  function validateStep(s: number): boolean {
    const errs: Partial<Record<keyof FormData | 'general', string>> = {}
    const realStep = isLoggedIn ? s + 1 : s // map visual step to form step

    if (!isLoggedIn && realStep === 0) {
      if (!form.ownerName.trim()) errs.ownerName = 'Full name is required'
      if (!form.ownerEmail.trim() || !form.ownerEmail.includes('@')) errs.ownerEmail = 'Valid email required'
      if (form.ownerPassword.length < 8) errs.ownerPassword = 'At least 8 characters'
      if (form.ownerPassword !== form.ownerConfirm) errs.ownerConfirm = 'Passwords do not match'
    }
    if (realStep === 1) {
      if (!form.name.trim()) errs.name = 'Shop name is required'
      if (!form.slug.trim()) errs.slug = 'Shop URL is required'
      else if (!/^[a-z0-9-]+$/.test(form.slug)) errs.slug = 'Only lowercase letters, numbers and hyphens'
      else if (slugTaken) errs.slug = 'That URL is already taken'
    }
    if (realStep === 2) {
      if (!form.email.trim() || !form.email.includes('@')) errs.email = 'Valid email required'
      if (!form.phone.trim()) errs.phone = 'Phone is required'
      if (!form.address.trim()) errs.address = 'Address is required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function next() {
    if (!validateStep(step)) return
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  function back() { setStep(s => Math.max(s - 1, firstStep)) }

  async function submit() {
    if (!validateStep(step)) return
    setSubmitting(true)
    setErrors({})
    try {
      const res = await fetch('/api/shops/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Account (only sent when not logged in)
          ...(!isLoggedIn ? {
            ownerName: form.ownerName,
            ownerEmail: form.ownerEmail,
            ownerPassword: form.ownerPassword,
          } : {}),
          // Shop
          name: form.name,
          slug: form.slug,
          description: form.description,
          email: form.email,
          phone: form.phone,
          address: form.address,
          currency: form.currency,
        }),
      })

      const d = await res.json()

      if (!res.ok) {
        if (d.error === 'slug_taken') {
          setSlugTaken(true)
          setStep(isLoggedIn ? 0 : 1)
          setErrors({ slug: 'That URL is already taken — try another' })
        } else if (d.error === 'email_taken') {
          setStep(0)
          setErrors({ ownerEmail: 'An account with this email already exists. Sign in instead.' })
        } else if (d.error === 'already_has_shop') {
          setErrors({ general: d.message })
        } else {
          setErrors({ general: d.message ?? d.error ?? 'Something went wrong. Please try again.' })
        }
        return
      }

      // Auto sign-in if a new account was created (best-effort — don't block success)
      if (d.newAccount && d.ownerEmail) {
        signIn('credentials', {
          redirect: false,
          identifier: d.ownerEmail,
          password: form.ownerPassword,
        }).catch(() => {})
      }

      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  // ── Success screen ───────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Shop Submitted!</h1>
            <p className="mt-2 text-gray-500">
              <strong>{form.name}</strong> has been submitted for review.
              {form.email && <> You&apos;ll get an email at <strong>{form.email}</strong> once approved.</>}
            </p>
          </div>
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-left space-y-2">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">What happens next?</p>
            <ul className="space-y-1.5 text-sm text-blue-800">
              {[
                'Our team reviews your shop (usually within 24h)',
                'You receive a confirmation email once approved',
                'Log in to your shop dashboard and add products',
                'Go live on the marketplace!',
              ].map(t => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />{t}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/"
              className="rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-center transition-colors">
              Back to Market
            </Link>
            <Link href="/shop"
              className="rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 text-center transition-colors">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const progress = (step / (STEPS.length - 1)) * 100
  const isLastStep = step === STEPS.length - 1
  const realStep = isLoggedIn ? step + 1 : step

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-white">

      {/* Header */}
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-md px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-200">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Open Your Shop — Free</p>
            <p className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* 3 role icons */}
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-100">
                <Crown className="h-3.5 w-3.5 text-yellow-600" />
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
                <ShoppingCart className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100">
                <Truck className="h-3.5 w-3.5 text-purple-600" />
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-600">{Math.round(progress)}%</span>
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-2xl">
          <div className="h-1.5 rounded-full bg-gray-100">
            <div className="h-1.5 rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Step indicators */}
      <div className="border-b border-gray-100 bg-white/60 px-4 py-3 overflow-x-auto">
        <div className="mx-auto flex max-w-2xl gap-1 min-w-max">
          {STEPS.map((s, i) => {
            const isDone = i < step
            const isActive = i === step
            return (
              <button key={i} type="button" onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-sm'
                  : isDone ? 'text-green-700 bg-green-50 cursor-pointer hover:bg-green-100'
                  : 'text-gray-400 cursor-default'
                }`}>
                {isDone ? <Check className="h-4 w-4 shrink-0" /> : <s.icon className="h-4 w-4 shrink-0" />}
                <span className="text-xs font-semibold whitespace-nowrap">{s.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        <div className="mx-auto w-full max-w-2xl space-y-5">

          {errors.general && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{errors.general}
            </div>
          )}

          {/* Step 0 — Account creation (guests only) */}
          {!isLoggedIn && step === 0 && (
            <Card icon={User} title="Create Your Account" desc="Your free owner account — takes 30 seconds">
              {/* Role intro */}
              <div className="flex gap-3 rounded-xl bg-blue-50 border border-blue-100 p-3">
                {[
                  { Icon: Crown,        label: 'Owner',    color: 'bg-yellow-100 text-yellow-600' },
                  { Icon: ShoppingCart, label: 'Sales',    color: 'bg-blue-100 text-blue-600' },
                  { Icon: Truck,        label: 'Delivery', color: 'bg-purple-100 text-purple-600' },
                ].map(({ Icon, label, color }) => (
                  <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-600">{label}</span>
                    <span className="text-[9px] text-gray-400 text-center leading-tight">Own account</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 -mt-1 text-center">
                You&apos;ll get an <strong>Owner</strong> account. Add sales and delivery staff later from your dashboard.
              </p>

              <Field label="Full Name *" error={errors.ownerName}>
                <input value={form.ownerName} onChange={e => set('ownerName', e.target.value)}
                  placeholder="Ahmed Al Mansoori" autoComplete="name"
                  className={inp(errors.ownerName)} />
              </Field>
              <Field label="Email *" error={errors.ownerEmail}>
                <input type="email" value={form.ownerEmail} onChange={e => set('ownerEmail', e.target.value)}
                  placeholder="you@example.com" autoComplete="email"
                  className={inp(errors.ownerEmail)} />
              </Field>
              <Field label="Password *" error={errors.ownerPassword}>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.ownerPassword}
                    onChange={e => set('ownerPassword', e.target.value)}
                    placeholder="At least 8 characters" autoComplete="new-password"
                    className={inp(errors.ownerPassword)} />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm Password *" error={errors.ownerConfirm}>
                <input type="password" value={form.ownerConfirm}
                  onChange={e => set('ownerConfirm', e.target.value)}
                  placeholder="Repeat password" autoComplete="new-password"
                  className={inp(errors.ownerConfirm)} />
              </Field>

              <p className="text-center text-xs text-gray-400">
                Already have an account?{' '}
                <Link href="/account?next=/open-shop" className="text-blue-600 font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </Card>
          )}

          {/* Step 1 — Shop basics */}
          {realStep === 1 && (
            <Card icon={Store} title="Name Your Shop" desc="Choose a name and URL — the URL is permanent">
              <Field label="Shop Name *" error={errors.name}>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Al Noor Electronics"
                  className={inp(errors.name)} />
              </Field>
              <Field label="Shop URL *" error={errors.slug}
                hint={!showSlug ? 'Auto-generated from your shop name' : undefined}>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">ismart.bh/shops/</span>
                  <div className="relative flex-1">
                    <input value={form.slug}
                      onChange={e => { setShowSlug(true); set('slug', slugify(e.target.value)) }}
                      onBlur={() => checkSlug(form.slug)}
                      placeholder="al-noor-electronics"
                      className={inp(errors.slug || (slugTaken ? 'taken' : undefined))} />
                    {checkingSlug && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />}
                    {!checkingSlug && slugTaken && <AlertCircle className="absolute right-3 top-2.5 h-4 w-4 text-red-500" />}
                  </div>
                </div>
                {slugTaken && <p className="text-xs text-red-600">That URL is taken — try a different one</p>}
              </Field>
              <Field label="Description (optional)">
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  rows={3} placeholder="Tell customers what your shop is about…"
                  className={`${inp()} resize-none`} />
              </Field>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">Your shop needs approval before going live — usually within 24 hours.</p>
              </div>
            </Card>
          )}

          {/* Step 2 — Contact */}
          {realStep === 2 && (
            <Card icon={MapPin} title="Contact & Location" desc="How customers and our team can reach you">
              <Field label="Business Email *" error={errors.email}>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="shop@example.com" className={inp(errors.email)} />
              </Field>
              <Field label="Phone Number *" error={errors.phone}>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+973 3300 0000" className={inp(errors.phone)} />
              </Field>
              <Field label="Business Address *" error={errors.address}>
                <textarea value={form.address} onChange={e => set('address', e.target.value)}
                  rows={3} placeholder="Building, Street, Area, City, Country"
                  className={`${inp(errors.address)} resize-none`} />
              </Field>
              <Field label="Currency">
                <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inp()}>
                  <option value="BHD">BHD — Bahraini Dinar</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="AED">AED — UAE Dirham</option>
                  <option value="SAR">SAR — Saudi Riyal</option>
                  <option value="KWD">KWD — Kuwaiti Dinar</option>
                </select>
              </Field>
            </Card>
          )}

          {/* Step 3 — Tax */}
          {realStep === 3 && (
            <Card icon={Percent} title="Tax Settings" desc="Configure tax — can be changed anytime in shop settings">
              <label className="flex items-center gap-3 cursor-pointer rounded-2xl border-2 border-gray-100 p-4 hover:border-blue-200 transition-colors">
                <div onClick={() => set('taxEnabled', !form.taxEnabled)}
                  className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${form.taxEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.taxEnabled ? 'translate-x-5' : ''}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Enable Tax on Orders</p>
                  <p className="text-xs text-gray-500">Tax will be shown at checkout</p>
                </div>
              </label>
              {form.taxEnabled && (
                <div className="space-y-3 rounded-2xl bg-gray-50 border border-gray-200 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tax Label"><input value={form.taxLabel} onChange={e => set('taxLabel', e.target.value)} placeholder="VAT" className={inp()} /></Field>
                    <Field label="Tax Rate (%)"><input type="number" min="0" max="100" step="0.1" value={form.taxRate} onChange={e => set('taxRate', e.target.value)} placeholder="10" className={inp()} /></Field>
                    <div className="col-span-2">
                      <Field label="Tax Registration Number (optional)">
                        <input value={form.taxNumber} onChange={e => set('taxNumber', e.target.value)} placeholder="e.g. BH123456789" className={inp()} />
                      </Field>
                    </div>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.taxInclusive} onChange={e => set('taxInclusive', e.target.checked)} className="h-4 w-4 mt-0.5 rounded border-gray-300 accent-blue-600" />
                    <div>
                      <p className="text-sm text-gray-700 font-medium">Tax-inclusive pricing</p>
                      <p className="text-xs text-gray-400">Prices already include tax — nothing extra added at checkout</p>
                    </div>
                  </label>
                </div>
              )}
              {!form.taxEnabled && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-center">
                  <p className="text-sm text-gray-500">No tax applied to orders</p>
                  <p className="text-xs text-gray-400 mt-1">Enable anytime from Shop Settings → Tax</p>
                </div>
              )}
            </Card>
          )}

          {/* Step 4 — First product */}
          {realStep === 4 && (
            <Card icon={Package} title="Add Your First Product" desc="Optional — skip and add products from your dashboard later">
              <Field label="Product Name">
                <input value={form.productName} onChange={e => set('productName', e.target.value)} placeholder="e.g. Wireless Earbuds Pro" className={inp()} />
              </Field>
              <Field label="Price">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-500">{form.currency}</span>
                  <input type="number" min="0" step="0.001" value={form.productPrice} onChange={e => set('productPrice', e.target.value)} placeholder="0.000" className={`${inp()} flex-1`} />
                </div>
              </Field>
              <Field label="Product Description">
                <textarea value={form.productDesc} onChange={e => set('productDesc', e.target.value)} rows={3} placeholder="Describe this product…" className={`${inp()} resize-none`} />
              </Field>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">Product will be added after your shop is approved. Skip is fine — you can add products later.</p>
              </div>
            </Card>
          )}

          {/* Step 5 — Review */}
          {realStep === 5 && (
            <Card icon={Rocket} title="Ready to Launch!" desc="Review your details and submit for approval">
              <div className="space-y-1">
                {!isLoggedIn && <ReviewRow label="Owner Name" value={form.ownerName} />}
                {!isLoggedIn && <ReviewRow label="Owner Email" value={form.ownerEmail} />}
                <ReviewRow label="Shop Name" value={form.name} />
                <ReviewRow label="Shop URL" value={`/shops/${form.slug}`} />
                {form.description && <ReviewRow label="Description" value={form.description} />}
                <ReviewRow label="Business Email" value={form.email} />
                <ReviewRow label="Phone" value={form.phone} />
                <ReviewRow label="Address" value={form.address} />
                <ReviewRow label="Currency" value={form.currency} />
                <ReviewRow label="Tax" value={form.taxEnabled ? `${form.taxLabel} ${form.taxRate}%` : 'Disabled'} />
                {form.productName && <ReviewRow label="First Product" value={`${form.productName} — ${form.currency} ${form.productPrice}`} />}
              </div>
              <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">After submission</p>
                <p className="text-sm text-blue-700">
                  Our team reviews your shop and approves it usually within 24 hours.
                  {form.email && <> Confirmation sent to <strong>{form.email}</strong>.</>}
                </p>
              </div>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 pb-8">
            {step > firstStep && (
              <button type="button" onClick={back}
                className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                <ChevronLeft className="h-4 w-4" />Back
              </button>
            )}
            <button type="button"
              onClick={isLastStep ? submit : next}
              disabled={submitting}
              className="ml-auto flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md shadow-blue-200">
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</>
                : isLastStep
                ? <><Rocket className="h-4 w-4" />Submit Shop</>
                : step === STEPS.length - 2 && !form.productName
                ? <>Skip & Continue<ChevronRight className="h-4 w-4" /></>
                : <>Continue<ChevronRight className="h-4 w-4" /></>}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
