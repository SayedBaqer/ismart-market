/**
 * Email sender using Nodemailer.
 *
 * Configure in .env.local:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=you@gmail.com
 *   SMTP_PASS=your-app-password
 *   SMTP_FROM="ibird Portal <no-reply@yourdomain.com>"
 *
 * If SMTP_HOST is not set, emails are silently skipped (no crash).
 */

import nodemailer from 'nodemailer'

function getTransport() {
  const host = process.env.SMTP_HOST
  if (!host) return null

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendMail(opts: {
  to: string
  subject: string
  html: string
  text?: string
}) {
  const transport = getTransport()
  if (!transport) {
    console.log('[mailer] SMTP not configured — skipping email to', opts.to)
    return
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'no-reply@portal'

  try {
    await transport.sendMail({ from, ...opts })
  } catch (err) {
    console.error('[mailer] Failed to send email:', err)
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function orderConfirmationHtml(opts: {
  companyName: string
  orderNumber: string
  customerName: string
  items: Array<{ name: string; qty: number; price: string }>
  total: string
  currency: string
}) {
  const rows = opts.items.map((item) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151">${item.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;text-align:center">${item.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;text-align:right">${item.price}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 40px;text-align:center">
            <h1 style="margin:0;font-size:24px;font-weight:800;color:white;letter-spacing:-0.5px">${opts.companyName}</h1>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.8)">Order Confirmation</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <p style="margin:0 0 6px;font-size:15px;color:#6b7280">Hello, ${opts.customerName}</p>
            <h2 style="margin:0 0 24px;font-size:20px;color:#111827">Your order has been received! 🎉</h2>

            <div style="background:#eff6ff;border-radius:10px;padding:14px 18px;margin-bottom:24px;display:inline-block">
              <p style="margin:0;font-size:12px;color:#3b82f6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Order Number</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:#1d4ed8;font-family:monospace">${opts.orderNumber}</p>
            </div>

            <!-- Items table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:20px">
              <thead>
                <tr style="background:#f9fafb">
                  <th style="padding:10px 12px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;text-align:left">Product</th>
                  <th style="padding:10px 12px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;text-align:center">Qty</th>
                  <th style="padding:10px 12px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;text-align:right">Price</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
              <tfoot>
                <tr style="background:#f9fafb">
                  <td colspan="2" style="padding:12px;font-size:14px;font-weight:700;color:#111827">Total</td>
                  <td style="padding:12px;font-size:16px;font-weight:800;color:#2563eb;text-align:right">${opts.total}</td>
                </tr>
              </tfoot>
            </table>

            <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6">
              We'll process your order shortly and notify you when it ships. Thank you for shopping with us!
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f1f5f9;padding:20px 40px;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af">© ${new Date().getFullYear()} ${opts.companyName} · This is an automated message</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
