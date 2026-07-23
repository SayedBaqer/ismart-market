'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="mb-4 text-5xl">⚠️</div>
      <h1 className="mb-2 text-xl font-bold text-gray-900">Something went wrong</h1>
      <p className="mb-6 text-sm text-gray-500">
        An unexpected error occurred. Please try again.
      </p>
      {error.digest && (
        <p className="mb-4 font-mono text-xs text-gray-400">Error ID: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Try Again
      </button>
    </div>
  )
}
