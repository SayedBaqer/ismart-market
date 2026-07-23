import { NextResponse } from 'next/server'

export async function POST() {
  // Schedule exit after the response is sent.
  // In dev: Next.js restarts automatically.
  // In production: PM2 / Docker / systemd restart policy kicks in.
  setTimeout(() => process.exit(0), 200)
  return NextResponse.json({ ok: true })
}
