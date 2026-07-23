'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    if (standalone) { setIsStandalone(true); return }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIos(ios)

    const saved = sessionStorage.getItem('pwa-banner-dismissed')
    if (saved) { setDismissed(true); return }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('pwa-banner-dismissed', '1')
  }

  const install = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setPrompt(null)
    dismiss()
  }

  if (isStandalone || dismissed) return null

  // iOS: show manual instructions
  if (isIos) {
    return (
      <div className="fixed bottom-16 left-3 right-3 z-50 rounded-2xl bg-gray-900 p-4 shadow-2xl text-white sm:hidden">
        <button onClick={dismiss} className="absolute top-3 right-3 text-gray-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold mb-1">Install iSmart Market</p>
        <p className="text-xs text-gray-300">
          Tap <span className="font-bold">Share</span> then <span className="font-bold">Add to Home Screen</span> to install the app.
        </p>
      </div>
    )
  }

  // Android/Chrome: native install prompt
  if (!prompt) return null

  return (
    <div className="fixed bottom-16 left-3 right-3 z-50 rounded-2xl bg-blue-600 p-4 shadow-2xl text-white sm:hidden flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <Download className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Install iSmart Market</p>
        <p className="text-xs text-blue-100">Add to your home screen for quick access</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={dismiss} className="text-blue-200 hover:text-white">
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={install}
          className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50"
        >
          Install
        </button>
      </div>
    </div>
  )
}
