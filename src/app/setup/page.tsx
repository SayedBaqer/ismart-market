'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Database, RefreshCw, AlertCircle } from 'lucide-react'

const STEPS = ['Database', 'Company', 'Admin Account', 'Done']

type Health = { dbConnected: boolean; setupCompleted: boolean }

export default function SetupPage() {
  const router = useRouter()

  // -1 = probing, 0 = DB, 1 = Company, 2 = Admin, 3 = Done
  const [step, setStep] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // DB step state
  const [provider, setProvider] = useState<'postgresql' | 'mysql'>('mysql')
  const [db, setDb] = useState({
    host: 'localhost',
    port: '3306',
    database: 'ibird_portal',
    username: 'root',
    password: '',
  })
  const [dbLoading, setDbLoading] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [pollCount, setPollCount] = useState(0)

  // Company step state
  const [company, setCompany] = useState({
    name: '',
    currency: 'BHD',
    language: 'en',
    address: '',
    phone: '',
  })

  // Admin step state
  const [admin, setAdmin] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  // On mount: probe health to decide where to start
  useEffect(() => {
    fetch('/api/setup/health')
      .then((r) => r.json())
      .then((h: Health) => {
        if (h.setupCompleted) {
          // Setup already done — go straight to login (no cookie needed)
          window.location.href = '/admin/login'
          return
        }
        setStep(h.dbConnected ? 1 : 0)
      })
      .catch(() => setStep(0)) // DB unreachable → show DB step
  }, [])

  // Poll after restart until DB is back
  useEffect(() => {
    if (!restarting) return
    const id = setInterval(async () => {
      setPollCount((n) => n + 1)
      try {
        const res = await fetch('/api/setup/health')
        if (res.ok) {
          const h: Health = await res.json()
          if (h.dbConnected) {
            clearInterval(id)
            setRestarting(false)
            setStep(1)
          }
        }
      } catch {
        // server still restarting — keep polling
      }
    }, 1500)
    return () => clearInterval(id)
  }, [restarting])

  // When switching provider, update default port and username
  function switchProvider(p: 'postgresql' | 'mysql') {
    setProvider(p)
    setDb((d) => ({
      ...d,
      port: p === 'mysql' ? '3306' : '5432',
      username: p === 'mysql' ? 'root' : 'postgres',
    }))
  }

  async function handleDbSetup() {
    setError('')
    setDbLoading(true)
    const res = await fetch('/api/setup/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...db, provider }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.detail ?? data.error ?? 'Database setup failed')
      setDbLoading(false)
      return
    }
    setDbLoading(false)
    if (data.skipRestart) {
      // In-process env update succeeded — no restart needed
      setStep(1)
    } else {
      // Production: server needs to restart to pick up new DATABASE_URL
      setRestarting(true)
      await fetch('/api/setup/restart', { method: 'POST' }).catch(() => {})
    }
  }

  async function handleFinish() {
    if (admin.password !== admin.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (admin.password.length < 10) {
      setError('Password must be at least 10 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, admin }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Setup failed')
        setLoading(false)
        return
      }
      setStep(3)
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  // Probing
  if (step === -1) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Checking system status…
        </div>
      </div>
    )
  }

  // Restarting / polling
  if (restarting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <RefreshCw className="mx-auto h-10 w-10 animate-spin text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Restarting server…</h2>
          <p className="text-sm text-gray-500">
            The server is applying the new database connection. This usually takes 5–15 seconds.
          </p>
          <div className="flex justify-center gap-1 pt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-blue-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400">Attempt {pollCount}…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
            <span className="text-xl font-bold text-white">P</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Portal Setup</h1>
          <p className="mt-1 text-sm text-gray-500">Let's get your store ready in a few steps</p>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-1.5 flex-wrap">
          {STEPS.map((s, i) => {
            const displayStep = step // step 0 = DB, etc.
            return (
              <div key={s} className="flex items-center gap-1.5">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    i < displayStep
                      ? 'bg-green-500 text-white'
                      : i === displayStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {i < displayStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={`text-xs ${i === displayStep ? 'font-medium text-gray-900' : 'text-gray-400'}`}
                >
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`h-px w-6 ${i < displayStep ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        {/* ── Step 0: Database ── */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Database Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Provider selector */}
              <div className="grid grid-cols-2 gap-3">
                {([
                  {
                    id: 'mysql' as const,
                    label: 'MySQL',
                    badge: 'cPanel / Shared hosting',
                    color: 'orange',
                    desc: 'Included free with most cPanel hosts',
                  },
                  {
                    id: 'postgresql' as const,
                    label: 'PostgreSQL',
                    badge: 'VPS / Dedicated',
                    color: 'blue',
                    desc: 'More powerful, needs a VPS server',
                  },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => switchProvider(opt.id)}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      provider === opt.id
                        ? opt.color === 'orange'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`font-semibold text-sm ${
                      provider === opt.id
                        ? opt.color === 'orange' ? 'text-orange-700' : 'text-blue-700'
                        : 'text-gray-700'
                    }`}>
                      {opt.label}
                    </p>
                    <p className={`text-xs mt-0.5 ${
                      provider === opt.id
                        ? opt.color === 'orange' ? 'text-orange-600' : 'text-blue-600'
                        : 'text-gray-400'
                    }`}>
                      {opt.badge}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {provider === 'mysql' && (
                <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-800">
                  <strong>cPanel users:</strong> Create a MySQL database in cPanel → Databases → MySQL Databases, then enter those credentials below.
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Host</label>
                  <input
                    value={db.host}
                    onChange={(e) => setDb((d) => ({ ...d, host: e.target.value }))}
                    placeholder="localhost"
                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Port</label>
                  <input
                    value={db.port}
                    onChange={(e) => setDb((d) => ({ ...d, port: e.target.value }))}
                    placeholder="5432"
                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Database Name</label>
                <input
                  value={db.database}
                  onChange={(e) => setDb((d) => ({ ...d, database: e.target.value }))}
                  placeholder="ibird_portal"
                  className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  {provider === 'mysql'
                    ? 'Create this database in cPanel → MySQL Databases first.'
                    : 'Must already exist. Run: '}
                  {provider === 'postgresql' && (
                    <code className="rounded bg-gray-100 px-1 font-mono">CREATE DATABASE ibird_portal;</code>
                  )}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Username</label>
                  <input
                    value={db.username}
                    onChange={(e) => setDb((d) => ({ ...d, username: e.target.value }))}
                    placeholder="postgres"
                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={db.password}
                    onChange={(e) => setDb((d) => ({ ...d, password: e.target.value }))}
                    placeholder="••••••••"
                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Connection string preview */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                <p className="text-xs text-gray-400 mb-1">Connection URL (will be saved to .env.local)</p>

                <code className="text-xs text-gray-600 break-all">
                  {provider}://{db.username || 'user'}:••••@{db.host || 'localhost'}:{db.port}/{db.database || 'dbname'}
                </code>
              </div>

              <Button className="w-full" isLoading={dbLoading} onClick={handleDbSetup}>
                <Database className="mr-2 h-4 w-4" />
                Connect & Create Tables
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 1: Welcome / Company ── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-500">
                These settings appear on invoices, PDFs, and the storefront.
              </p>
              <Input
                label="Company / Store Name *"
                required
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
                placeholder="e.g. iBird Electronics"
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Base Currency <span className="text-red-500">*</span>
                </label>
                <select
                  value={company.currency}
                  onChange={(e) => setCompany({ ...company, currency: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BHD">BHD — Bahraini Dinar (3 decimals)</option>
                  <option value="SAR">SAR — Saudi Riyal</option>
                  <option value="AED">AED — UAE Dirham</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="CNY">CNY — Chinese Yuan</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Language</label>
                <select
                  value={company.language}
                  onChange={(e) => setCompany({ ...company, language: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English (LTR)</option>
                  <option value="ar">العربية — Arabic (RTL)</option>
                </select>
              </div>
              <Input
                label="Address (optional)"
                value={company.address}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                placeholder="e.g. Manama, Bahrain"
              />
              <Input
                label="Phone (optional)"
                value={company.phone}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                placeholder="+973 1700 0000"
              />
              <Button
                className="w-full"
                onClick={() => {
                  if (!company.name) { setError('Company name is required'); return }
                  setError('')
                  setStep(2)
                }}
              >
                Next →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Admin account ── */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Administrator Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-500">
                This becomes the Super Admin account. Keep credentials safe.
              </p>
              <Input
                label="Full Name *"
                required
                value={admin.name}
                onChange={(e) => setAdmin({ ...admin, name: e.target.value })}
                placeholder="e.g. Ahmed Al-Ali"
              />
              <Input
                label="Email *"
                type="email"
                required
                value={admin.email}
                onChange={(e) => setAdmin({ ...admin, email: e.target.value })}
                placeholder="admin@yourstore.com"
              />
              <Input
                label="Password *"
                type="password"
                required
                value={admin.password}
                onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
                hint="Minimum 10 characters"
              />
              <Input
                label="Confirm Password *"
                type="password"
                required
                value={admin.confirmPassword}
                onChange={(e) => setAdmin({ ...admin, confirmPassword: e.target.value })}
                error={
                  admin.confirmPassword && admin.password !== admin.confirmPassword
                    ? 'Passwords do not match'
                    : undefined
                }
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  ← Back
                </Button>
                <Button
                  className="flex-1"
                  isLoading={loading}
                  onClick={handleFinish}
                  disabled={!admin.email || !admin.name || !admin.password}
                >
                  Complete Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <Check className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Setup Complete!</h2>
              <p className="text-sm text-gray-600">
                <strong>{company.name}</strong> is ready. Sign in with your admin account to start
                adding products and managing your store.
              </p>
              <Button className="w-full" onClick={() => router.push('/admin/login')}>
                Go to Admin Login →
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
