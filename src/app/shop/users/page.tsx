'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Plus, X, Check, Truck, ShoppingCart, Crown, RefreshCw, Smartphone, Zap, Trash2, Pencil, KeyRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useShopT } from '@/components/shop/lang-provider'
import type { ShopTranslations } from '@/lib/i18n/shop'

interface StaffMember {
  id: string
  name: string | null
  email: string
  username: string | null
  role: string
  isActive: boolean
  shopUserId: string
  joinedAt: string
}

interface Quota {
  STAFF: number
  CASHIER: number
}

function roleInfo(t: ShopTranslations) {
  return {
    MANAGER: {
      label: t.roleOwner,
      icon: Crown,
      color: 'bg-amber-100 text-amber-700',
      mobile: null as string | null,
    },
    STAFF: {
      label: t.roleSales,
      icon: ShoppingCart,
      color: 'bg-blue-100 text-blue-700',
      mobile: t.usrSalesMobileDesc,
    },
    CASHIER: {
      label: t.roleDelivery,
      icon: Truck,
      color: 'bg-purple-100 text-purple-700',
      mobile: t.usrDeliveryMobileDesc,
    },
  }
}

function addRoles(t: ShopTranslations) {
  return [
    { id: 'STAFF', label: t.usrSalesStaff, desc: t.usrSalesStaffDesc, quotaKey: 'STAFF' as const },
    { id: 'CASHIER', label: t.usrDeliveryStaff, desc: t.usrDeliveryStaffDesc, quotaKey: 'CASHIER' as const },
  ]
}

export default function ShopUsersPage() {
  const t = useShopT()
  const ROLE_INFO = roleInfo(t)
  const ADD_ROLES = addRoles(t)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [quota, setQuota] = useState<Quota>({ STAFF: 1, CASHIER: 1 })
  const [used, setUsed] = useState<Quota>({ STAFF: 0, CASHIER: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', role: 'STAFF' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', username: '' })
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

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
    if (!form.email || !form.password) { setError(t.usrEmailPasswordRequired); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/shop/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (!res.ok) {
      setError(d.error ?? t.usrCreateFailed)
      setSaving(false)
      return
    }
    setShowForm(false)
    setForm({ name: '', email: '', username: '', password: '', role: 'STAFF' })
    load()
    setSaving(false)
  }

  async function removeUser(shopUserId: string) {
    if (!confirm(t.usrRemoveConfirm)) return
    setDeletingId(shopUserId)
    await fetch('/api/shop/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopUserId }),
    })
    setDeletingId(null)
    load()
  }

  function startEdit(member: StaffMember) {
    setEditingId(member.shopUserId)
    setEditForm({ name: member.name ?? '', email: member.email, username: member.username ?? '' })
    setResettingId(null)
    setError('')
  }

  async function saveEdit(shopUserId: string) {
    setBusyId(shopUserId)
    setError('')
    const res = await fetch('/api/shop/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopUserId, ...editForm }),
    })
    const d = await res.json()
    if (!res.ok) { setError(d.error ?? t.usrUpdateFailed); setBusyId(null); return }
    setEditingId(null)
    load()
    setBusyId(null)
  }

  async function resetPassword(shopUserId: string) {
    if (newPassword.length < 8) { setError(t.usrPasswordTooShort); return }
    setBusyId(shopUserId)
    setError('')
    const res = await fetch('/api/shop/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopUserId, newPassword }),
    })
    const d = await res.json()
    if (!res.ok) { setError(d.error ?? t.usrResetFailed); setBusyId(null); return }
    setResettingId(null)
    setNewPassword('')
    setBusyId(null)
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
            {t.usrTitle}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{t.usrMembersInShop.replace('{count}', String(staff.length))}</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setError('') }} className="gap-2">
          <Plus className="h-4 w-4" />
          {t.usrAddStaff}
        </Button>
      </div>

      {/* Plan quota summary */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">{t.usrFreePlanQuota}</p>
          <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">{t.usrFree}</span>
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
                <p className="text-xs text-gray-400">{full ? t.usrSlotFull : t.usrAvailable.replace('{count}', String(q - u))}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile app capabilities */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-blue-600" />
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{t.usrMobileAppAccess}</p>
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
            <h2 className="text-sm font-bold text-gray-900">{t.usrAddStaffMember}</h2>
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
            <label className="mb-1.5 block text-xs font-medium text-gray-700">{t.usrRole}</label>
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
                      {full ? t.usrQuotaFull.replace('{used}', String(u)).replace('{quota}', String(q)) : t.usrUsed.replace('{used}', String(u)).replace('{quota}', String(q))}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {selectedAtQuota ? (
            <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-3 text-xs text-orange-700 text-center">
              <p className="font-semibold">{t.usrQuotaReached}</p>
              <p className="mt-0.5">{t.usrQuotaReachedHint}</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={t.usrFullName}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t.usrFullNamePlaceholder}
              />
              <Input
                label={t.usrEmailRequired}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@email.com"
                hint={t.usrEmailHint}
              />
              <Input
                label={t.usrUsernameOptional}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder={t.usrUsernamePlaceholder}
                hint={t.usrUsernameHint}
              />
              <Input
                label={t.usrPasswordRequired}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={t.usrPasswordPlaceholder}
              />
            </div>
          )}

          {!selectedAtQuota && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                {t.usrCancel}
              </Button>
              <Button className="flex-1" isLoading={saving} onClick={addUser}>
                <Check className="mr-2 h-4 w-4" />
                {t.usrCreateAccount}
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
            const isEditing = editingId === member.shopUserId
            const isResetting = resettingId === member.shopUserId
            const isBusy = busyId === member.shopUserId
            return (
              <div key={member.id} className="rounded-2xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 shrink-0 ${info?.color ?? 'bg-gray-100 text-gray-500'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{member.name ?? t.usrUnnamed}</p>
                    <p className="text-xs text-gray-400 truncate">{member.email}{member.username ? ` · @${member.username}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${info?.color ?? 'bg-gray-100 text-gray-500'}`}>
                      {info?.label ?? member.role}
                    </span>
                    {!isOwner && (
                      <>
                        <button
                          onClick={() => (isEditing ? setEditingId(null) : startEdit(member))}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                          title={t.usrEdit}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setResettingId(isResetting ? null : member.shopUserId); setEditingId(null); setNewPassword(''); setError('') }}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                          title={t.usrResetPassword}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeUser(member.shopUserId)}
                          disabled={deletingId === member.shopUserId}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title={t.usrRemove}
                        >
                          {deletingId === member.shopUserId
                            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                    <Input label={t.usrName} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    <Input label={t.usrEmail} type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    <Input label={t.usrUsername} value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingId(null)}>{t.usrCancel}</Button>
                      <Button size="sm" className="flex-1" isLoading={isBusy} onClick={() => saveEdit(member.shopUserId)}>{t.usrSave}</Button>
                    </div>
                  </div>
                )}

                {isResetting && (
                  <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t.usrNewPasswordPlaceholder}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <Button size="sm" isLoading={isBusy} onClick={() => resetPassword(member.shopUserId)}>{t.usrSet}</Button>
                  </div>
                )}
              </div>
            )
          })}
          {staff.length === 0 && (
            <div className="text-center py-10 rounded-2xl bg-white border border-gray-100 text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">{t.usrNoStaffYet}</p>
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
          <p className="text-sm font-bold text-gray-900">{t.usrNeedMoreSlots}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t.usrUpgradeHint}</p>
        </div>
        <span className="shrink-0 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-500">
          {t.usrComingSoon}
        </span>
      </div>
    </div>
  )
}
