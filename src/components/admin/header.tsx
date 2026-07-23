'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut, Bell } from 'lucide-react'

interface AdminHeaderProps {
  title: string
  user: { name?: string | null; email: string; role: string }
}

export function AdminHeader({ title, user }: AdminHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="relative rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
            {(user.name ?? user.email)[0].toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-gray-900">{user.name ?? user.email}</p>
            <p className="text-[10px] text-gray-400 capitalize">{user.role.toLowerCase().replace('_', ' ')}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="text-gray-500"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
