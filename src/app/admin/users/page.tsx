'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Plus, X, Check, Pencil, Search, ShieldCheck } from 'lucide-react'

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'CASHIER', 'CUSTOMER'] as const
type Role = typeof ROLES[number]

const ROLE_COLORS: Record<Role, 'info' | 'warning' | 'success' | 'default' | 'danger'> = {
  SUPER_ADMIN: 'danger',
  ADMIN: 'warning',
  MANAGER: 'info',
  STAFF: 'default',
  CASHIER: 'success',
  CUSTOMER: 'default',
}

// Preset capability bundles for quick assignment
const PRESETS: Record<string, { label: string; caps: Record<string, boolean> }> = {
  delivery: {
    label: 'Delivery Driver',
    caps: {
      'orders.view': true,
      'orders.update_status': true,
    },
  },
  cashier: {
    label: 'Cashier Only',
    caps: {
      'orders.view': true,
      'orders.create': true,
      'products.view': true,
    },
  },
  stock_only: {
    label: 'Stock Manager',
    caps: {
      'products.view': true,
      'stock.view': true,
      'stock.adjust': true,
    },
  },
}

// Every grantable capability, grouped for the custom picker — mirrors src/lib/auth/capabilities.ts
const CAPABILITY_GROUPS: { label: string; caps: string[] }[] = [
  { label: 'Products', caps: ['products.view', 'products.create', 'products.edit', 'products.delete'] },
  { label: 'Categories', caps: ['categories.view', 'categories.create', 'categories.edit', 'categories.delete'] },
  { label: 'Stock', caps: ['stock.view', 'stock.adjust', 'stock.import', 'stock.batches.delete'] },
  { label: 'Orders', caps: ['orders.view', 'orders.create', 'orders.edit', 'orders.update_status', 'orders.delete'] },
  { label: 'Billing', caps: ['billing.view', 'billing.create', 'billing.edit', 'billing.delete', 'billing.payments'] },
  { label: 'Customers', caps: ['customers.view', 'customers.create', 'customers.edit', 'customers.delete'] },
  { label: 'Reports', caps: ['reports.view', 'reports.financial'] },
  { label: 'Users', caps: ['users.view', 'users.create', 'users.edit', 'users.delete'] },
  { label: 'Settings', caps: ['settings.view', 'settings.edit'] },
  { label: 'Plugins', caps: ['plugins.manage'] },
  { label: 'News', caps: ['news.view', 'news.create', 'news.edit', 'news.delete'] },
]

interface User {
  id: string
  name: string | null
  email: string
  role: Role
  isActive: boolean
  capabilities: Record<string, boolean>
  createdAt: string
}

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'STAFF' as Role,
  preset: '',
  customCaps: {} as Record<string, boolean>,
  isActive: true,
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`)
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [q])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditUser(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  function openEdit(u: User) {
    setEditUser(u)
    const hasCaps = Object.keys(u.capabilities ?? {}).length > 0
    // Existing custom grants (including ones no preset covers, like plugins.manage)
    // load straight into the custom picker so they're visible and editable.
    setForm({
      name: u.name ?? '', email: u.email, password: '', role: u.role,
      preset: hasCaps ? 'custom' : '',
      customCaps: hasCaps ? u.capabilities : {},
      isActive: u.isActive,
    })
    setError('')
    setShowForm(true)
  }

  function applyPreset(presetKey: string) {
    setForm((f) => ({ ...f, preset: presetKey, customCaps: presetKey === 'custom' ? f.customCaps : {} }))
  }

  function toggleCustomCap(cap: string) {
    setForm((f) => ({ ...f, customCaps: { ...f.customCaps, [cap]: !f.customCaps[cap] } }))
  }

  async function save() {
    if (!form.name || !form.email) { setError('Name and email are required'); return }
    if (!editUser && !form.password) { setError('Password is required for new users'); return }
    setSaving(true)
    setError('')

    const caps = form.preset === 'custom' ? form.customCaps : form.preset ? PRESETS[form.preset]?.caps ?? {} : undefined

    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      role: form.role,
      isActive: form.isActive,
      ...(caps ? { capabilities: caps } : {}),
      ...(form.password ? { password: form.password } : {}),
    }

    const url = editUser ? `/api/admin/users/${editUser.id}` : '/api/admin/users'
    const method = editUser ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed')
      setSaving(false)
      return
    }

    setShowForm(false)
    setSaving(false)
    load()
  }

  async function deactivate(id: string) {
    if (!confirm('Deactivate this user?')) return
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    load()
  }

  const filtered = users.filter((u) =>
    !q ||
    u.name?.toLowerCase().includes(q.toLowerCase()) ||
    u.email.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">{users.length} portal users</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardContent className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                {editUser ? 'Edit User' : 'New User'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input
                label={editUser ? 'New Password (leave blank to keep)' : 'Password *'}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                hint="Minimum 8 characters"
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>

            {/* Capability presets */}
            <div>
              <p className="mb-2 text-xs font-medium text-gray-700 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Capability Preset (optional — restricts what this user can do)
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setForm({ ...form, preset: '' })}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${!form.preset ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  Full role permissions
                </button>
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${form.preset === key ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  onClick={() => applyPreset('custom')}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${form.preset === 'custom' ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  Custom…
                </button>
              </div>
              {form.preset && form.preset !== 'custom' && (
                <p className="mt-1 text-xs text-gray-500">
                  Granted: {Object.keys(PRESETS[form.preset]?.caps ?? {}).join(', ')}
                </p>
              )}
              {form.preset === 'custom' && (
                <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  {CAPABILITY_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{group.label}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {group.caps.map((cap) => (
                          <label key={cap} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!form.customCaps[cap]}
                              onChange={() => toggleCustomCap(cap)}
                              className="rounded"
                            />
                            {cap}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              Active account
            </label>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" isLoading={saving} onClick={save}>
                <Check className="mr-1 h-4 w-4" />
                {editUser ? 'Save Changes' : 'Create User'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-400">No users found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Capabilities</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => {
                  const capKeys = Object.keys(u.capabilities ?? {}).filter((k) => u.capabilities[k])
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{u.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ROLE_COLORS[u.role] ?? 'default'}>
                          {u.role.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {capKeys.length > 0
                          ? <span title={capKeys.join(', ')} className="text-blue-600 cursor-help">{capKeys.length} override{capKeys.length > 1 ? 's' : ''}</span>
                          : <span className="text-gray-400">Full role</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={u.isActive ? 'success' : 'danger'}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(u)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {u.isActive && (
                            <button onClick={() => deactivate(u.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 text-xs px-2">
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
