'use client'

import { useState } from 'react'
import { KeyRound, Save } from 'lucide-react'
import { useShopT } from '@/components/shop/lang-provider'

export default function ShopAccountPage() {
  const t = useShopT()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function submit() {
    setError('')
    setSuccess(false)
    if (newPassword.length < 6) { setError(t.acctPasswordTooShort); return }
    if (newPassword !== confirmPassword) { setError(t.acctPasswordsMismatch); return }

    setSaving(true)
    const res = await fetch('/api/account/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? t.acctChangeFailed)
    } else {
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setSaving(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-5 pb-24 md:pb-6 max-w-md">
      <div className="flex items-center gap-3">
        <KeyRound className="h-5 w-5 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t.acctTitle}</h1>
          <p className="text-xs text-gray-500">{t.acctSubtitle}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-3">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
            {t.acctPasswordChanged}
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-gray-600">{t.acctCurrentPassword}</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">{t.acctNewPassword}</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">{t.acctConfirmNewPassword}</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? t.acctSaving : t.acctChangePassword}
        </button>
      </div>
    </div>
  )
}
