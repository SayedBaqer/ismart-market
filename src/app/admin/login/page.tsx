'use client'

import { useActionState, useEffect, useState } from 'react'
import { loginAction } from './actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null)
  const [callbackUrl, setCallbackUrl] = useState('/admin')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setCallbackUrl(params.get('callbackUrl') ?? '/admin')
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <span className="text-lg font-bold text-white">iS</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">iSmart Market Admin</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
        </div>

        <form action={formAction} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

          {state?.error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <Input
            label="Email or Username"
            type="text"
            name="identifier"
            required
            autoComplete="username"
            placeholder="admin or admin@example.com"
          />

          <Input
            label="Password"
            type="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />

          <Button type="submit" isLoading={pending} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          Secure admin access — unauthorised access is prohibited
        </p>
      </div>
    </div>
  )
}
