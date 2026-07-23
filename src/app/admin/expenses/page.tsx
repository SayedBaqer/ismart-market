'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Receipt } from 'lucide-react'

interface Expense {
  id: string
  category: string
  description: string | null
  amount: number
  currency: string
  expenseDate: string
  vendor: string | null
  recurrence: string
}

const CATEGORIES = [
  'Rent', 'Utilities', 'Salaries', 'Inventory', 'Marketing',
  'Shipping', 'Equipment', 'Software', 'Maintenance', 'Other',
]

const EMPTY = {
  category: 'Other',
  description: '',
  amount: '',
  currency: 'BHD',
  expenseDate: new Date().toISOString().slice(0, 10),
  vendor: '',
  recurrence: 'ONCE',
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/expenses')
    if (res.ok) setExpenses(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Amount is required'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: form.category,
        description: form.description || undefined,
        amount: parseFloat(form.amount),
        currency: form.currency,
        expenseDate: form.expenseDate,
        vendor: form.vendor || undefined,
        recurrence: form.recurrence,
      }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed')
      setSaving(false)
      return
    }
    setShowForm(false)
    setSaving(false)
    setForm(EMPTY)
    load()
  }

  const totalBhd = expenses
    .filter((e) => e.currency === 'BHD')
    .reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500">Total (BHD): {totalBhd.toFixed(3)} BHD</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Expense
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">New Expense</h2>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            {error && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>}
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Input
                label="Amount *"
                type="number"
                min="0"
                step="0.001"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                >
                  <option>BHD</option>
                  <option>USD</option>
                  <option>CNY</option>
                  <option>EUR</option>
                </select>
              </div>
              <Input
                label="Date *"
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
              />
              <Input
                label="Vendor"
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                placeholder="Vendor or payee"
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Recurrence</label>
                <select
                  value={form.recurrence}
                  onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="ONCE">One-time</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <Input
                  label="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What was this expense for?"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" isLoading={saving} onClick={save}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
          ) : expenses.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="mx-auto mb-3 h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">No expenses recorded yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-left font-medium">Vendor</th>
                  <th className="px-4 py-3 text-center font-medium">Recurrence</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {new Date(e.expenseDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{e.category}</td>
                    <td className="px-4 py-2.5 text-gray-500">{e.description ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{e.vendor ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-400">
                      {e.recurrence === 'ONCE' ? 'One-time' : e.recurrence.charAt(0) + e.recurrence.slice(1).toLowerCase()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                      {Number(e.amount).toFixed(3)} {e.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
