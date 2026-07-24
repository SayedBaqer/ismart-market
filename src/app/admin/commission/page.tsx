'use client'

import { useEffect, useState } from 'react'
import { Percent, Truck, DollarSign, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Config { type: 'percentage' | 'fixed'; value: number }

export default function CommissionPage() {
  const [sales, setSales] = useState<Config>({ type: 'percentage', value: 0 })
  const [delivery, setDelivery] = useState<Config>({ type: 'fixed', value: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      if (d['platform.commission.sales']) setSales(JSON.parse(d['platform.commission.sales']))
      if (d['platform.commission.delivery']) setDelivery(JSON.parse(d['platform.commission.delivery']))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    await Promise.all([
      fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'platform.commission.sales', value: JSON.stringify(sales) }) }),
      fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'platform.commission.delivery', value: JSON.stringify(delivery) }) }),
    ])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading...</div>

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Commission & Fees</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform earnings from shop sales and deliveries</p>
      </div>

      {/* Sales commission */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Percent className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Sales Commission</p>
            <p className="text-xs text-gray-500">Platform cut from each shop sale</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
            <select value={sales.type} onChange={e => setSales(s => ({ ...s, type: e.target.value as 'percentage' | 'fixed' }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>
          <div className="flex-1">
            <Input
              label={sales.type === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (BHD)'}
              type="number"
              min="0"
              step="0.01"
              value={String(sales.value)}
              onChange={e => setSales(s => ({ ...s, value: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>
        <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Example: On a 10.000 BHD sale, platform earns{' '}
          <strong>
            {sales.type === 'percentage'
              ? `${(10 * sales.value / 100).toFixed(3)} BHD (${sales.value}%)`
              : `${Number(sales.value).toFixed(3)} BHD (fixed)`}
          </strong>
        </div>
      </div>

      {/* Delivery commission */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
            <Truck className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Delivery Fee</p>
            <p className="text-xs text-gray-500">Platform charge for each delivery</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
            <select value={delivery.type} onChange={e => setDelivery(s => ({ ...s, type: e.target.value as 'percentage' | 'fixed' }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>
          <div className="flex-1">
            <Input
              label={delivery.type === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (BHD)'}
              type="number"
              min="0"
              step="0.001"
              value={String(delivery.value)}
              onChange={e => setDelivery(s => ({ ...s, value: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>
        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          <DollarSign className="inline h-3.5 w-3.5 mr-1" />
          Per delivery, platform earns{' '}
          <strong>{delivery.type === 'fixed' ? `${Number(delivery.value).toFixed(3)} BHD` : `${delivery.value}% of order total`}</strong>
        </div>
      </div>

      <Button onClick={save} isLoading={saving} className="w-full gap-2">
        <Save className="h-4 w-4" />
        {saved ? 'Saved!' : 'Save Commission Settings'}
      </Button>
    </div>
  )
}
