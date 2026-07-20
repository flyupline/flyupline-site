// FlyUp Line branded transactional emails via Resend.
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'FlyUp Line <bookings@flyupline.com>'
const TEAM_EMAIL = process.env.TEAM_EMAIL || 'flyupline.booking@gmail.com'
const SITE = process.env.PUBLIC_SITE_URL || 'https://flyupline.com'
const LOGO = `${SITE}/assets/img/logo2.png`
const BRAND = '#FF6100'

export const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

export function shell(inner) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)">
  <tr><td style="background:#0a0a0b;padding:26px 32px;text-align:center"><img src="${LOGO}" alt="FlyUp Line" height="34" style="height:34px"></td></tr>
  <tr><td style="height:4px;background:${BRAND}"></td></tr>
  <tr><td style="padding:34px 32px">${inner}</td></tr>
  <tr><td style="background:#0d0d0f;padding:24px 32px;text-align:center">
    <p style="margin:0 0 8px;color:#cfcfcf;font:13px/1.6 Arial,sans-serif"><a href="${SITE}" style="color:${BRAND};text-decoration:none;font-weight:bold">flyupline.com</a></p>
    <p style="margin:0 0 10px;color:#9a9a9a;font:12px/1.7 Arial,sans-serif">Fast booking, low prices, happy journeys<br>+20 120 529 5295 &nbsp;·&nbsp; flyupline.booking@gmail.com</p>
    <p style="margin:0;font:12px Arial,sans-serif">
      <a href="https://www.facebook.com/share/1Xm2pf4WSC/" style="color:#9a9a9a;text-decoration:none;margin:0 6px">Facebook</a>
      <a href="https://x.com/FlyupLine" style="color:#9a9a9a;text-decoration:none;margin:0 6px">X</a>
      <a href="https://www.instagram.com/flyupline/" style="color:#9a9a9a;text-decoration:none;margin:0 6px">Instagram</a>
    </p>
  </td></tr>
</table></td></tr></table></body></html>`
}

const money = (n, cur = 'USD') =>
  n == null || n === '' ? '' : `${cur} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

const row = (k, v) =>
  v
    ? `<tr><td style="padding:7px 0;color:#777;font:14px Arial,sans-serif;width:150px;vertical-align:top">${esc(k)}</td><td style="padding:7px 0;color:#111;font:14px Arial,sans-serif">${esc(v)}</td></tr>`
    : ''

export async function sendEmail({ to, subject, html, replyTo }) {
  if (!RESEND_API_KEY) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: Array.isArray(to) ? to : [to], subject, html, reply_to: replyTo }),
    })
    return res.ok
  } catch {
    return false
  }
}

// Customer-facing "your quote is ready" email.
export function quoteEmailHtml({ firstName, reference, destination, dates, travelers, fromPrice, currency, expiresAt, message, quoteUrl }) {
  const details = [
    row('Reference', reference),
    row('Destination', destination),
    row('Travel dates', dates),
    row('Travellers', travelers),
    fromPrice != null ? row('From', money(fromPrice, currency)) : '',
    expiresAt ? row('Valid until', expiresAt) : '',
  ].join('')
  return shell(`
    <h1 style="margin:0 0 14px;color:#111;font:700 24px Arial,sans-serif">Your travel quote is ready${firstName ? ', ' + esc(firstName) : ''}!</h1>
    <p style="margin:0 0 18px;color:#444;font:16px/1.65 Arial,sans-serif">Our travel experts have prepared a personalised quote for your trip. Review the full details, compare options, and let us know how you'd like to proceed.</p>
    ${message ? `<div style="background:#faf7f4;border-left:3px solid ${BRAND};padding:14px 18px;margin:0 0 20px;border-radius:0 8px 8px 0;color:#444;font:15px/1.6 Arial,sans-serif">${esc(message).replace(/\n/g, '<br>')}</div>` : ''}
    <table role="presentation" width="100%" style="margin:0 0 24px;border-top:1px solid #eee;border-bottom:1px solid #eee">${details}</table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 22px"><tr><td style="border-radius:999px;background:${BRAND}">
      <a href="${quoteUrl}" style="display:inline-block;padding:15px 40px;color:#fff;font:700 16px Arial,sans-serif;text-decoration:none;border-radius:999px">View Your Quote &rarr;</a>
    </td></tr></table>
    <p style="margin:0;color:#888;font:13px/1.6 Arial,sans-serif;text-align:center">This quote is an estimate of interest and is not a confirmed booking. Prices and availability are subject to change until your booking is finalised by FlyUp Line.</p>
  `)
}

// Internal admin alert email.
export function adminAlertHtml({ heading, lines }) {
  return shell(`
    <h1 style="margin:0 0 16px;color:#111;font:700 22px Arial,sans-serif">${esc(heading)}</h1>
    <table role="presentation" width="100%">${lines.map(([k, v]) => row(k, v)).join('')}</table>
  `)
}

export { TEAM_EMAIL, money }
