'use client'

import { useEffect, useState, useCallback } from 'react'
import { Save, Crown, Zap, TrendingUp, Users } from 'lucide-react'

interface PlanRow {
  price: number
  branches: number
  ordersPerMonth: number
  ordersPerDay: number
}

type Plan = 'FREE' | 'STARTER' | 'BUSINESS' | 'ENTERPRISE'
const PLANS: Plan[] = ['FREE', 'STARTER', 'BUSINESS', 'ENTERPRISE']

const PLAN_META: Record<Plan, { label: string; icon: typeof Users; color: string }> = {
  FREE: { label: 'Free', icon: Users, color: 'text-gray-600' },
  STARTER: { label: 'Starter', icon: Zap, color: 'text-blue-600' },
  BUSINESS: { label: 'Business', icon: TrendingUp, color: 'text-violet-600' },
  ENTERPRISE: { label: 'Enterprise', icon: Crown, color: 'text-amber-600' },
}

export default function AdminPlansPage() {
  const [config, setConfig] = useState<Record<Plan, PlanRow> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/plans')
    if (res.ok) setConfig(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function update(plan: Plan, field: keyof PlanRow, value: string) {
    setConfig((c) => c ? { ...c, [plan]: { ...c[plan], [field]: Number(value) || 0 } } : c)
    setSaved(false)
  }

  async function save() {
    if (!config) return
    setSaving(true)
    const res = await fetch('/api/admin/plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    if (res.ok) { setConfig(await res.json()); setSaved(true); setTimeout(() => setSaved(false), 2500) }
    setSaving(false)
  }

  if (loading || !config) return <div className="p-8 text-sm text-gray-400">Loading…</div>

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monthly price and limits per plan — shown to shop owners, used to gate features</p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const meta = PLAN_META[plan]
          const Icon = meta.icon
          const row = config[plan]
          return (
            <div key={plan} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${meta.color}`} />
                <p className="font-bold text-gray-900">{meta.label}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Price (BHD / month)</label>
                <input
                  type="number" min={0} step="0.001"
                  value={row.price}
                  onChange={(e) => update(plan, 'price', e.target.value)}
                  placeholder={plan === 'ENTERPRISE' ? '0 = "Contact us"' : undefined}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                {plan === 'ENTERPRISE' && <p className="text-xs text-gray-400 mt-1">0 shows as &quot;Contact us&quot; to shop owners</p>}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Branches</label>
                  <input type="number" min={0} value={row.branches}
                    onChange={(e) => update(plan, 'branches', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Orders/day</label>
                  <input type="number" min={0} value={row.ordersPerDay}
                    onChange={(e) => update(plan, 'ordersPerDay', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Orders/mo</label>
                  <input type="number" min={0} value={row.ordersPerMonth}
                    onChange={(e) => update(plan, 'ordersPerMonth', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400">
        Individual shops can still be given a per-shop override (e.g. a discount or extra allowance) from that shop&apos;s detail page.
      </p>
    </div>
  )
}
