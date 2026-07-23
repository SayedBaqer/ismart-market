import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'

// Content-Security-Policy
// In development: allow unsafe-eval (needed by Next.js HMR) and unsafe-inline.
// In production: remove unsafe-eval; inline scripts are still needed for Next.js
//   hydration chunks. A nonce-based CSP would be ideal but requires a custom
//   middleware — this is the practical baseline for a self-hosted portal.
const csp = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Allow service worker scope
  "worker-src 'self'",
].join('; ')

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },

          // Disallow embedding in iframes
          { key: 'X-Frame-Options', value: 'DENY' },

          // Legacy XSS filter (defence-in-depth for old browsers)
          { key: 'X-XSS-Protection', value: '1; mode=block' },

          // Control referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          // Disable unused browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },

          // HSTS — force HTTPS for 1 year (only meaningful in production behind TLS)
          // includeSubDomains + preload ready
          ...(!isDev
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains; preload',
                },
              ]
            : []),

          // Content Security Policy
          { key: 'Content-Security-Policy', value: csp },
        ],
      },

      // Static assets can be cached aggressively — Next.js busts them via hashes
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },

      // Service worker must not be cached so updates are picked up immediately
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

export default nextConfig
