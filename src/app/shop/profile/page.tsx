'use client'

import { useEffect, useState, useCallback } from 'react'
import { Store, Save, MapPin, Plus, Trash2, Phone, Mail } from 'lucide-react'

interface ShopProfile {
  id: string
  name: string
  description: string | null
  email: string | null
  phone: string | null
  address: string | null
  logoUrl: string | null
  plan: string
}

interface Branch {
  id: string
  name: string
  address: string | null
  phone: string | null
  isMain: boolean
  isActive: boolean
}

export default function ShopProfilePage() {
  const [profile, setProfile] = useState<ShopProfile | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [branches, setBranches] = useState<Branch[]>([])
  const [branchLimit, setBranchLimit] = useState(1)
  const [newBranch, setNewBranch] = useState({ name: '', address: '', phone: '' })
  const [addingBranch, setAddingBranch] = useState(false)
  const [branchError, setBranchError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [profileRes, branchesRes] = await Promise.all([
      fetch('/api/shop/profile'),
      fetch('/api/shop/branches'),
    ])
    if (profileRes.ok) {
      const { shop } = await profileRes.json()
      setProfile(shop)
      setName(shop.name ?? '')
      setDescription(shop.description ?? '')
      setEmail(shop.email ?? '')
      setPhone(shop.phone ?? '')
      setAddress(shop.address ?? '')
    }
    if (branchesRes.ok) {
      const data = await branchesRes.json()
      setBranches(data.branches ?? [])
      setBranchLimit(data.limit ?? 1)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveProfile() {
    if (!name.trim()) { setError('Shop name is required'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/shop/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, email, phone, address }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to save')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  async function addBranch() {
    if (!newBranch.name.trim()) { setBranchError('Branch name is required'); return }
    setAddingBranch(true)
    setBranchError('')
    const res = await fetch('/api/shop/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBranch),
    })
    if (!res.ok) {
      const d = await res.json()
      setBranchError(d.error ?? 'Failed to add branch')
    } else {
      setNewBranch({ name: '', address: '', phone: '' })
      load()
    }
    setAddingBranch(false)
  }

  async function removeBranch(id: string) {
    if (!confirm('Remove this branch?')) return
    const res = await fetch(`/api/shop/branches/${id}`, { method: 'DELETE' })
    if (res.ok) load()
    else {
      const d = await res.json()
      setBranchError(d.error ?? 'Failed to remove branch')
    }
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-5 pb-24 md:pb-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Store className="h-5 w-5 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Shop Profile</h1>
          <p className="text-xs text-gray-500">Edit your shop name and manage branches</p>
        </div>
      </div>

      {/* Shop info */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Basic Info</h2>
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div>
          <label className="text-xs font-semibold text-gray-600">Shop Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1"><Mail className="h-3 w-3" /> Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 flex items-center gap-1"><MapPin className="h-3 w-3" /> Main Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      {/* Branches */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Branches</h2>
            <p className="text-xs text-gray-400">{branches.length} / {branchLimit} used on your {profile?.plan} plan</p>
          </div>
        </div>

        {branchError && <p className="text-xs text-red-600">{branchError}</p>}

        <div className="space-y-2">
          {branches.map((b) => (
            <div key={b.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  {b.name}
                  {b.isMain && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">MAIN</span>}
                </p>
                {b.address && <p className="text-xs text-gray-500 mt-0.5">{b.address}</p>}
                {b.phone && <p className="text-xs text-gray-400">{b.phone}</p>}
              </div>
              {!b.isMain && (
                <button type="button" onClick={() => removeBranch(b.id)} className="text-gray-400 hover:text-red-600 shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {branches.length < branchLimit ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-4 space-y-2">
            <input placeholder="Branch name" value={newBranch.name}
              onChange={(e) => setNewBranch((v) => ({ ...v, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input placeholder="Address (optional)" value={newBranch.address}
              onChange={(e) => setNewBranch((v) => ({ ...v, address: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input placeholder="Phone (optional)" value={newBranch.phone}
              onChange={(e) => setNewBranch((v) => ({ ...v, phone: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button
              type="button"
              onClick={addBranch}
              disabled={addingBranch}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> {addingBranch ? 'Adding…' : 'Add Branch'}
            </button>
          </div>
        ) : (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            Branch limit reached for your plan. Upgrade to add more branches.
          </p>
        )}
      </div>
    </div>
  )
}
