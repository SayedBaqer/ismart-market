export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50">
        <svg className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      </div>
      <div>
        <h1 className="text-xl font-bold text-gray-900">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-gray-500 max-w-xs">
          Check your internet connection and try again.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
