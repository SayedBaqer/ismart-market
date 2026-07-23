'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Plus, X, Check, Truck, ShoppingCart, Crown, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface StaffMember {
  id: string
  name: string | null
  email: string
  role: string
  isActive: boolean
  joinedAt: string
}

const ROLES = [
  { id: 'MANAGER', label: 'Owner', desc: 'Full access: orders, stock, users, reports', icon: Crown, color: 'bg-amber-100 text-amber-700' },
  { id: 'STAFF', label: 'Sales', desc: 'Create orders, manage customers, assign delivery', icon: ShoppingCart, color: 'bg-blue-100 text-blue-700' },
  { id: 'CASHIER', label: 'Delivery', desc: 'View assigned orders, update delivery status', icon: Truck, color: 'bg-purple-100 text-purple-700' },
]

export default function ShopUsersPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STAFF' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/shop/staff')
    const data = await res.json()
    setStaff(data.staff ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addUser() {
    if (!form.email || !form.password) { setError('Email and password required'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/shop/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed')
      setSaving(false)
      return
    }
    setShowForm(false)
    setForm({ name: '', email: '', password: '', role: 'STAFF' })
    load()
    setSaving(false)
  }

  const roleInfo = (role: string) => ROLES.find((r) => r.id === role)

  return (
    <div className="p-4 md:p-6 space-y-5 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Staff Users
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{staff.length} members in your shop</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-1 gap-2">
        {ROLES.map((r) => {
          const Icon = r.icon
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
              <div className={`rounded-lg p-2 ${r.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{r.label}</p>
                <p className="text-xs text-gray-400">{r.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-md p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Add New Staff Member</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ahmed Ali" />
            <Input label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@email.com" />
            <Input label="Password *" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label} — {r.desc.split(',')[0]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button className="flex-1" isLoading={saving} onClick={addUser}>
              <Check className="mr-2 h-4 w-4" />
              Create Account
            </Button>
          </div>
        </div>
      )}

      {/* Staff list */}
      {loading ? (
        <div className="text-center py-10"><RefreshCw className="h-6 w-6 text-gray-300 animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-2">
          {staff.map((member) => {
            const role = roleInfo(member.role)
            const Icon = role?.icon ?? Users
            return (
              <div key={member.id} className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                <div className={`rounded-xl p-2.5 ${role?.color ?? 'bg-gray-100 text-gray-500'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{member.name ?? 'Unnamed'}</p>
                  <p className="text-xs text-gray-400 truncate">{member.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-0.5 ${role?.color ?? 'bg-gray-100 text-gray-500'}`}>
                    {role?.label ?? member.role}
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {member.isActive ? '● Active' : '○ Inactive'}
                  </p>
                </div>
              </div>
            )
          })}
          {staff.length === 0 && (
            <div className="text-center py-10 rounded-2xl bg-white border border-gray-100 text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No staff yet — add your first team member</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
