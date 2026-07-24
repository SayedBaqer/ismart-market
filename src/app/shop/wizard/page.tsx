'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Store, MapPin, Percent, Package, Rocket, ChevronRight, ChevronLeft,
  Check, AlertCircle, Loader2, Eye, EyeOff,
} from 'lucide-react'

interface FormData {
  // Step 1 — basics
  name: string; slug: string; description: string
  // Step 2 — contact
  email: string; phone: string; address: string; currency: string
  // Step 3 — tax
  taxEnabled: boolean; taxRate: string; taxInclusive: boolean; taxLabel: string; taxNumber: string
  // Step 4 — first product (optional)
  productName: string; productPrice: string; productDesc: string
}

const STEPS = [
  { icon: Store, label: 'Shop Info', desc: 'Name & identity' },
  { icon: MapPin, label: 'Contact', desc: 'Location & reach' },
  { icon: Percent, label: 'Tax', desc: 'Optional tax settings' },
  { icon: Package, label: 'First Product', desc: 'Optional starter' },
  { icon: Rocket, label: 'Launch', desc: 'Submit for review' },
]

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

export default function ShopWizardPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>({
    name: '', slug: '', description: '',
    email: '', phone: '', address: '', currency: 'BHD',
    taxEnabled: false, taxRate: '10', taxInclusive: false, taxLabel: 'VAT', taxNumber: '',
    productName: '', productPrice: '', productDesc: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [slugTaken, setSlugTaken] = useState(false)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [showSlug, setShowSlug] = useState(false)

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: undefined }))
    if (key === 'name' && !showSlug) {
      const auto = slugify(value as string)
      setForm(f => ({ ...f, name: value as string, slug: auto }))
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
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (s === 0) {
      if (!form.name.trim()) errs.name = 'Shop name is required'
      if (!form.slug.trim()) errs.slug = 'Shop URL is required'
      else if (!/^[a-z0-9-]+$/.test(form.slug)) errs.slug = 'Only lowercase letters, numbers and hyphens'
      else if (slugTaken) errs.slug = 'That URL is already taken'
    }
    if (s === 1) {
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

  function back() { setStep(s => Math.max(s - 1, 0)) }

  async function submit() {
    if (!validateStep(step)) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/shops/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description,
          email: form.email,
          phone: form.phone,
          address: form.address,
          currency: form.currency,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        if (d.error?.includes('already taken')) {
          setSlugTaken(true)
          setStep(0)
          setErrors({ slug: 'That URL is already taken' })
        }
        return
      }
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Shop Submitted!</h1>
            <p className="mt-2 text-gray-500">Your shop <strong>{form.name}</strong> has been submitted for review. You&apos;ll receive an email at <strong>{form.email}</strong> once approved.</p>
          </div>
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-left space-y-2">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">What happens next?</p>
            <ul className="space-y-1.5 text-sm text-blue-800">
              {['Our team reviews your shop details (usually within 24h)', 'You get a login email with your shop panel access', 'Complete your shop profile & add products', 'Go live on the marketplace!'].map(t => (
                <li key={t} className="flex items-start gap-2"><Check className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />{t}</li>
              ))}
            </ul>
          </div>
          <button type="button" onClick={() => router.push('/')}
            className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700">
            Back to Marketplace
          </button>
        </div>
      </div>
    )
  }

  const progress = ((step) / (STEPS.length - 1)) * 100

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-md px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-200">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Open Your Shop</p>
            <p className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs font-semibold text-blue-600">{Math.round(progress)}% complete</p>
          </div>
        </div>
        {/* Progress bar */}
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
            const done = i < step
            const active = i === step
            return (
              <button key={i} type="button" onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all ${active ? 'bg-blue-600 text-white shadow-sm' : done ? 'text-green-700 bg-green-50 cursor-pointer hover:bg-green-100' : 'text-gray-400 bg-transparent cursor-default'}`}>
                {done ? <Check className="h-4 w-4 shrink-0" /> : <s.icon className="h-4 w-4 shrink-0" />}
                <span className="text-xs font-semibold whitespace-nowrap">{s.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        <div className="mx-auto w-full max-w-2xl space-y-5">

          {/* Step 0 — Shop basics */}
          {step === 0 && (
            <StepCard icon={Store} title="Name Your Shop" desc="Choose a name and URL for your shop. You can change the display name later but the URL is permanent.">
              <Field label="Shop Name *" error={errors.name}>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Al Noor Electronics"
                  className={input(errors.name)} />
              </Field>

              <Field label="Shop URL (ibird.bh/shop/…)" error={errors.slug}
                hint={!showSlug ? 'Auto-generated from your name' : undefined}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input value={form.slug}
                      onChange={e => { setShowSlug(true); set('slug', slugify(e.target.value)) }}
                      onBlur={() => checkSlug(form.slug)}
                      placeholder="al-noor-electronics"
                      className={input(errors.slug || (slugTaken ? 'taken' : undefined))} />
                    {checkingSlug && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />}
                    {!checkingSlug && slugTaken && <AlertCircle className="absolute right-3 top-2.5 h-4 w-4 text-red-500" />}
                  </div>
                  <button type="button" onClick={() => setShowSlug(!showSlug)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50">
                    {showSlug ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {slugTaken && <p className="mt-1 text-xs text-red-600">That URL is already taken — try a different one</p>}
              </Field>

              <Field label="Description (optional)">
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  rows={3} placeholder="Tell customers what your shop is about…"
                  className={`${input()} resize-none`} />
              </Field>

              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">Your shop will be reviewed by our team before it goes live. This usually takes less than 24 hours.</p>
              </div>
            </StepCard>
          )}

          {/* Step 1 — Contact */}
          {step === 1 && (
            <StepCard icon={MapPin} title="Contact & Location" desc="How customers and our team can reach you.">
              <Field label="Business Email *" error={errors.email}>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="shop@example.com"
                  className={input(errors.email)} />
              </Field>
              <Field label="Phone Number *" error={errors.phone}>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+973 3300 0000"
                  className={input(errors.phone)} />
              </Field>
              <Field label="Business Address *" error={errors.address}>
                <textarea value={form.address} onChange={e => set('address', e.target.value)}
                  rows={3} placeholder="Building, Street, Area, City, Country"
                  className={`${input(errors.address)} resize-none`} />
              </Field>
              <Field label="Currency">
                <select value={form.currency} onChange={e => set('currency', e.target.value)}
                  className={input()}>
                  <option value="BHD">BHD — Bahraini Dinar</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="AED">AED — UAE Dirham</option>
                  <option value="SAR">SAR — Saudi Riyal</option>
                  <option value="KWD">KWD — Kuwaiti Dinar</option>
                </select>
              </Field>
            </StepCard>
          )}

          {/* Step 2 — Tax */}
          {step === 2 && (
            <StepCard icon={Percent} title="Tax Settings" desc="Configure whether your shop charges tax. You can always change this later in Shop Settings.">
              <label className="flex items-center gap-3 cursor-pointer rounded-2xl border-2 border-gray-100 p-4 hover:border-blue-200 transition-colors">
                <div onClick={() => set('taxEnabled', !form.taxEnabled)}
                  className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${form.taxEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.taxEnabled ? 'translate-x-5' : ''}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Enable Tax on Orders</p>
                  <p className="text-xs text-gray-500">Tax will be calculated and shown at checkout</p>
                </div>
              </label>

              {form.taxEnabled && (
                <div className="space-y-3 rounded-2xl bg-gray-50 border border-gray-200 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tax Label">
                      <input value={form.taxLabel} onChange={e => set('taxLabel', e.target.value)}
                        placeholder="VAT" className={input()} />
                    </Field>
                    <Field label="Tax Rate (%)">
                      <input type="number" min="0" max="100" step="0.1"
                        value={form.taxRate} onChange={e => set('taxRate', e.target.value)}
                        placeholder="10" className={input()} />
                    </Field>
                    <div className="col-span-2">
                      <Field label="Tax Registration Number (optional)">
                        <input value={form.taxNumber} onChange={e => set('taxNumber', e.target.value)}
                          placeholder="e.g. BH123456789" className={input()} />
                      </Field>
                    </div>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.taxInclusive} onChange={e => set('taxInclusive', e.target.checked)}
                      className="h-4 w-4 mt-0.5 rounded border-gray-300 accent-blue-600" />
                    <div>
                      <p className="text-sm text-gray-700 font-medium">Tax-inclusive pricing</p>
                      <p className="text-xs text-gray-400">Product prices already include tax — no extra amount added at checkout</p>
                    </div>
                  </label>
                </div>
              )}

              {!form.taxEnabled && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-center">
                  <p className="text-sm text-gray-500">No tax will be applied to orders from your shop</p>
                  <p className="text-xs text-gray-400 mt-1">You can enable this anytime from Shop Settings → Tax</p>
                </div>
              )}
            </StepCard>
          )}

          {/* Step 3 — First product */}
          {step === 3 && (
            <StepCard icon={Package} title="Add Your First Product" desc="Optional — skip to submit your shop now and add products later from your shop dashboard.">
              <Field label="Product Name">
                <input value={form.productName} onChange={e => set('productName', e.target.value)}
                  placeholder="e.g. Wireless Earbuds Pro"
                  className={input()} />
              </Field>
              <Field label="Price">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-500">{form.currency}</span>
                  <input type="number" min="0" step="0.001"
                    value={form.productPrice} onChange={e => set('productPrice', e.target.value)}
                    placeholder="0.000" className={`${input()} flex-1`} />
                </div>
              </Field>
              <Field label="Product Description">
                <textarea value={form.productDesc} onChange={e => set('productDesc', e.target.value)}
                  rows={3} placeholder="Describe this product…"
                  className={`${input()} resize-none`} />
              </Field>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">Product will be added after your shop is approved. You can also skip this and add products from your dashboard.</p>
              </div>
            </StepCard>
          )}

          {/* Step 4 — Review & Submit */}
          {step === 4 && (
            <StepCard icon={Rocket} title="Ready to Launch!" desc="Review your shop details below and submit for approval.">
              <div className="space-y-3">
                <ReviewRow label="Shop Name" value={form.name} />
                <ReviewRow label="Shop URL" value={`/shop/${form.slug}`} />
                {form.description && <ReviewRow label="Description" value={form.description} />}
                <ReviewRow label="Email" value={form.email} />
                <ReviewRow label="Phone" value={form.phone} />
                <ReviewRow label="Address" value={form.address} />
                <ReviewRow label="Currency" value={form.currency} />
                <ReviewRow label="Tax"
                  value={form.taxEnabled ? `${form.taxLabel} ${form.taxRate}% (${form.taxInclusive ? 'inclusive' : 'on top'})` : 'Disabled'} />
                {form.productName && <ReviewRow label="First Product" value={`${form.productName} — ${form.currency} ${form.productPrice}`} />}
              </div>

              <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 space-y-2">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">After submission</p>
                <p className="text-sm text-blue-700">Our team will review and approve your shop. You&apos;ll get an email at <strong>{form.email}</strong> with your shop panel login details.</p>
              </div>
            </StepCard>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button type="button" onClick={back}
                className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                <ChevronLeft className="h-4 w-4" />Back
              </button>
            )}
            <button type="button"
              onClick={step === STEPS.length - 1 ? submit : next}
              disabled={submitting}
              className="ml-auto flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md shadow-blue-200">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</> :
                step === STEPS.length - 1 ? <><Rocket className="h-4 w-4" />Submit Shop</> :
                step === 3 && !form.productName ? <>Skip & Continue<ChevronRight className="h-4 w-4" /></> :
                <>Continue<ChevronRight className="h-4 w-4" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function input(err?: string) {
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

function StepCard({ icon: Icon, title, desc, children }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; children: React.ReactNode }) {
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
