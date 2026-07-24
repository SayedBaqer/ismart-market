'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Plus, X, Check, Truck, ShoppingCart, Crown, RefreshCw, Smartphone, Zap, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface StaffMember {
  id: string
  name: string | null
  email: string
  role: string
  isActive: boolean
  shopUserId: string
  joinedAt: string
}

interface Quota {
  STAFF: number
  CASHIER: number
}

const ROLE_INFO = {
  MANAGER: {
    label: 'Owner',
    icon: Crown,
    color: 'bg-amber-100 text-amber-700',
    mobile: null,
  },
  STAFF: {
    label: 'Sales',
    icon: ShoppingCart,
    color: 'bg-blue-100 text-blue-700',
    mobile: 'Create orders, manage customers, view stock',
  },
  CASHIER: {
    label: 'Delivery',
    icon: Truck,
    color: 'bg-purple-100 text-purple-700',
    mobile: 'View assigned deliveries, update status, confirm delivery',
  },
}

const ADD_ROLES = [
  { id: 'STAFF', label: 'Sales Staff', desc: 'Create orders, manage customers, assign delivery', quotaKey: 'STAFF' as const },
  { id: 'CASHIER', label: 'Delivery Staff', desc: 'View assigned orders, update delivery status', quotaKey: 'CASHIER' as const },
]

export default function ShopUsersPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [quota, setQuota] = useState<Quota>({ STAFF: 1, CASHIER: 1 })
  const [used, setUsed] = useState<Quota>({ STAFF: 0, CASHIER: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STAFF' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/shop/staff')
    const data = await res.json()
    setStaff(data.staff ?? [])
    setQuota(data.quota ?? { STAFF: 1, CASHIER: 1 })
    setUsed(data.used ?? { STAFF: 0, CASHIER: 0 })
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
    const d = await res.json()
    if (!res.ok) {
      setError(d.error ?? 'Failed to create account')
      setSaving(false)
      return
    }
    setShowForm(false)
    setForm({ name: '', email: '', password: '', role: 'STAFF' })
    load()
    setSaving(false)
  }

  async function removeUser(shopUserId: string) {
    if (!confirm('Remove this staff member?')) return
    setDeletingId(shopUserId)
    await fetch('/api/shop/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopUserId }),
    })
    setDeletingId(null)
    load()
  }

  const selectedRoleInfo = ADD_ROLES.find((r) => r.id === form.role)
  const selectedAtQuota = selectedRoleInfo
    ? used[selectedRoleInfo.quotaKey] >= quota[selectedRoleInfo.quotaKey]
    : false

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
        <Button size="sm" onClick={() => { setShowForm(true); setError('') }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {/* Plan quota summary */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Free Plan Quota</p>
          <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">Free</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {ADD_ROLES.map((r) => {
            const u = used[r.quotaKey]
            const q = quota[r.quotaKey]
            const full = u >= q
            return (
              <div key={r.id} className={`rounded-xl p-3 ${full ? 'bg-orange-50 border border-orange-200' : 'bg-white border border-blue-100'}`}>
                <p className="text-xs font-semibold text-gray-700">{r.label}</p>
                <p className={`text-lg font-bold mt-0.5 ${full ? 'text-orange-600' : 'text-blue-600'}`}>
                  {u} / {q}
                </p>
                <p className="text-xs text-gray-400">{full ? 'Slot full' : `${q - u} available`}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile app capabilities */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-blue-600" />
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Mobile App Access</p>
        </div>
        {ADD_ROLES.map((r) => {
          const info = ROLE_INFO[r.id as keyof typeof ROLE_INFO]
          const Icon = info.icon
          return (
            <div key={r.id} className="flex items-start gap-3">
              <div className={`rounded-lg p-2 shrink-0 ${info.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{r.label}</p>
                <p className="text-xs text-gray-400">{info.mobile}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-md p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Add Staff Member</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Role selector first so user sees quota before filling form */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">Role *</label>
            <div className="grid grid-cols-2 gap-2">
              {ADD_ROLES.map((r) => {
                const u = used[r.quotaKey]
                const q = quota[r.quotaKey]
                const full = u >= q
                const selected = form.role === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={full}
                    onClick={() => !full && setForm({ ...form, role: r.id })}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-50'
                        : full
                        ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <p className="text-xs font-bold text-gray-900">{r.label}</p>
                    <p className={`text-xs mt-0.5 ${full ? 'text-orange-500 font-semibold' : 'text-gray-400'}`}>
                      {full ? `Quota full (${u}/${q})` : `${u}/${q} used`}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {selectedAtQuota ? (
            <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-3 text-xs text-orange-700 text-center">
              <p className="font-semibold">Quota reached for this role</p>
              <p className="mt-0.5">Remove an existing member or upgrade your plan to add more.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Ahmed Ali"
              />
              <Input
                label="Email *"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@email.com"
              />
              <Input
                label="Password *"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 8 characters"
              />
            </div>
          )}

          {!selectedAtQuota && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button className="flex-1" isLoading={saving} onClick={addUser}>
                <Check className="mr-2 h-4 w-4" />
                Create Account
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Staff list */}
      {loading ? (
        <div className="text-center py-10">
          <RefreshCw className="h-6 w-6 text-gray-300 animate-spin mx-auto" />
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map((member) => {
            const info = ROLE_INFO[member.role as keyof typeof ROLE_INFO]
            const Icon = info?.icon ?? Users
            const isOwner = member.role === 'MANAGER'
            return (
              <div key={member.id} className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                <div className={`rounded-xl p-2.5 shrink-0 ${info?.color ?? 'bg-gray-100 text-gray-500'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{member.name ?? 'Unnamed'}</p>
                  <p className="text-xs text-gray-400 truncate">{member.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${info?.color ?? 'bg-gray-100 text-gray-500'}`}>
                    {info?.label ?? member.role}
                  </span>
                  {!isOwner && (
                    <button
                      onClick={() => removeUser(member.shopUserId)}
                      disabled={deletingId === member.shopUserId}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      {deletingId === member.shopUserId
                        ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  )}
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

      {/* Upgrade teaser */}
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-md">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">Need more staff slots?</p>
          <p className="text-xs text-gray-500 mt-0.5">Upgrade to unlock more Sales, Delivery &amp; Manager accounts</p>
        </div>
        <span className="shrink-0 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-500">
          Coming Soon
        </span>
      </div>
    </div>
  )
}
