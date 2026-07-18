// Vercel serverless function — receives a form submission, stores it in
// Supabase, emails the team a branded alert, and sends the customer a branded
// confirmation. Native fetch only (no dependencies).
//
// Hardening: input validation + length caps, per-IP rate limiting (via
// Supabase), sanitized/bounded storage, honeypot, and a soft origin check.

import crypto from 'node:crypto'

const {
  RESEND_API_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TEAM_EMAIL = 'flyupline.booking@gmail.com',
  FROM_EMAIL = 'FlyUp Line <onboarding@resend.dev>',
} = process.env

const LOGO = 'https://flyupline.vercel.app/assets/img/logo2.png'
const BRAND = '#FF6100'

// Abuse controls
const RATE_WINDOW_MIN = 10
const RATE_MAX = 5 // submissions per IP per window
const RATE_SALT = SUPABASE_SERVICE_ROLE_KEY || 'flyupline-fallback-salt'
const CAP = { name: 100, email: 160, phone: 40, message: 2000, field: 120, date: 60, cabin: 40, type: 60, legs: 6 }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+]?[\d\s()\-]{7,20}$/
const ALLOWED_HOSTS = ['flyupline.com', 'www.flyupline.com', 'flyupline.vercel.app']

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const clean = (v, max) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim().slice(0, max))
const asArray = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v])
const intIn = (v, lo, hi) => {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo
}
const hashIp = (ip) => crypto.createHash('sha256').update(ip + RATE_SALT).digest('hex')

// Normalize + bound the raw submission into a safe, known shape.
function normalize(body) {
  const legs = []
  const froms = asArray(body['from[]']).slice(0, CAP.legs)
  const tos = asArray(body['to[]']).slice(0, CAP.legs)
  for (let i = 0; i < Math.max(froms.length, tos.length); i++) {
    const f = clean(froms[i], CAP.field)
    const t = clean(tos[i], CAP.field)
    if (f || t) legs.push(`${f || '?'} → ${t || '?'}`)
  }
  const dates = ['multiCityDate1', 'multiCityDate2', 'multiCityDate3', 'multiCityDate4', 'onewaydate']
    .map((k) => clean(body[k], CAP.date))
    .filter(Boolean)
  const adults = intIn(body.adult_quantity, 0, 30)
  const children = intIn(body.child_quantity, 0, 30)
  const infants = intIn(body.infant_quantity, 0, 30)
  const travelers = []
  if (adults) travelers.push(`${adults} adult(s)`)
  if (children) travelers.push(`${children} child(ren)`)
  if (infants) travelers.push(`${infants} infant(s)`)
  return {
    form_type: clean(body.form_type, CAP.type) || 'quote',
    name: clean(body.fullname || body.name, CAP.name),
    email: clean(body.email, CAP.email),
    phone: clean(body.phone, CAP.phone),
    notes: clean(body.message, CAP.message),
    cabin: clean(body.cabin_class, CAP.cabin),
    legs,
    dates,
    travelers,
  }
}

const rows = (pairs) =>
  pairs
    .filter(([, v]) => v && String(v).length)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:9px 0;color:#777;font:14px Arial,sans-serif;width:130px;vertical-align:top">${esc(
          k
        )}</td><td style="padding:9px 0;color:#111;font:14px Arial,sans-serif">${esc(v)}</td></tr>`
    )
    .join('')

const shell = (inner) => `<!doctype html><html><body style="margin:0;background:#f4f4f5;padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)">
  <tr><td style="background:#0a0a0b;padding:26px 32px;text-align:center"><img src="${LOGO}" alt="FlyUp Line" height="34" style="height:34px"></td></tr>
  <tr><td style="height:4px;background:${BRAND}"></td></tr>
  <tr><td style="padding:34px 32px">${inner}</td></tr>
  <tr><td style="background:#0d0d0f;padding:22px 32px;text-align:center"><p style="margin:0;color:#9a9a9a;font:12px/1.6 Arial,sans-serif">FlyUp Line · Fast booking, low prices, happy journeys<br>+20 120 529 5295 · flyupline.booking@gmail.com</p></td></tr>
</table></td></tr></table></body></html>`

function customerHtml(d) {
  const summary = rows([
    ['Route', d.legs.join('  •  ')],
    ['Dates', d.dates.join('  •  ')],
    ['Travelers', d.travelers.join(', ')],
    ['Cabin', d.cabin],
  ])
  return shell(`
    <h1 style="margin:0 0 14px;color:#111;font:700 24px Arial,sans-serif">Thank you${d.name ? ', ' + esc(d.name) : ''}!</h1>
    <p style="margin:0 0 16px;color:#444;font:16px/1.65 Arial,sans-serif">We've received your request and our travel experts are already searching for the best available flights for your trip. You'll receive personalized options and prices by email <strong>within 24 hours</strong>.</p>
    ${summary ? `<table role="presentation" width="100%" style="margin:6px 0 20px;border-top:1px solid #eee;border-bottom:1px solid #eee">${summary}</table>` : ''}
    <p style="margin:0;color:#444;font:16px/1.65 Arial,sans-serif">Need to add anything? Just reply to this email or call <a href="tel:+201205295295" style="color:${BRAND};text-decoration:none">+20 120 529 5295</a>.</p>
    <p style="margin:22px 0 0;color:#444;font:16px/1.65 Arial,sans-serif">Warm regards,<br><strong>The FlyUp Line Team</strong></p>
  `)
}

function teamHtml(d) {
  const detail = rows([
    ['Type', d.form_type],
    ['Name', d.name],
    ['Email', d.email],
    ['Phone', d.phone],
    ['Route', d.legs.join('  •  ')],
    ['Dates', d.dates.join('  •  ')],
    ['Travelers', d.travelers.join(', ')],
    ['Cabin', d.cabin],
    ['Notes', d.notes],
  ])
  return shell(`
    <h1 style="margin:0 0 16px;color:#111;font:700 22px Arial,sans-serif">New ${esc(d.form_type)}</h1>
    <table role="presentation" width="100%">${detail}</table>
  `)
}

async function resendSend(payload) {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return r.ok
  } catch {
    return false
  }
}

const sbHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

async function overRateLimit(ipHash) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false
  try {
    const since = new Date(Date.now() - RATE_WINDOW_MIN * 60000).toISOString()
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/quote_requests?ip_hash=eq.${ipHash}&created_at=gt.${encodeURIComponent(since)}&select=id`,
      { headers: { ...sbHeaders, Prefer: 'count=exact', Range: '0-0' } }
    )
    const total = Number((r.headers.get('content-range') || '*/0').split('/')[1]) || 0
    return total >= RATE_MAX
  } catch {
    return false // fail open on counting errors; other controls still apply
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Soft origin check: reject browser requests from foreign sites.
  const origin = req.headers.origin
  if (origin) {
    let host = ''
    try {
      host = new URL(origin).hostname
    } catch {
      host = ''
    }
    const ok = ALLOWED_HOSTS.includes(host) || host.endsWith('.vercel.app') || host === 'localhost'
    if (!ok) return res.status(403).json({ error: 'Forbidden origin' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  } catch {
    return res.status(400).json({ error: 'Invalid request body' })
  }
  if (typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Invalid request body' })

  // Honeypot — silently accept and drop bots.
  if (body.botcheck) return res.status(200).json({ ok: true })

  const d = normalize(body)

  // Validation — name, email, and (for quotes) flight info are required;
  // phone is optional but must be valid when provided.
  const isQuote = /quote/i.test(d.form_type)
  if (!d.name || d.name.length < 2) return res.status(400).json({ error: 'Please provide your name.' })
  if (!EMAIL_RE.test(d.email)) return res.status(400).json({ error: 'Please provide a valid email address.' })
  if (d.phone && !PHONE_RE.test(d.phone)) {
    return res.status(400).json({ error: 'Please enter a valid phone number, or leave it blank.' })
  }
  if (isQuote && d.legs.length === 0) {
    return res.status(400).json({ error: 'Please provide your flight details (from, to, and dates).' })
  }

  // Rate limiting (per IP over a rolling window)
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  const ipHash = hashIp(ip)
  if (await overRateLimit(ipHash)) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a few minutes or contact us directly.' })
  }

  // 1) Store the request (sanitized payload only — never the raw body).
  let storeOk = false
  try {
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/quote_requests`, {
        method: 'POST',
        headers: { ...sbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({
          form_type: d.form_type,
          full_name: d.name,
          email: d.email,
          phone: d.phone || null,
          notes: d.notes || null,
          ip_hash: ipHash,
          payload: {
            route: d.legs,
            dates: d.dates,
            travelers: d.travelers,
            cabin: d.cabin,
          },
        }),
      })
      storeOk = r.ok
    }
  } catch {
    storeOk = false
  }

  // 2) Notify the team.
  const teamOk = await resendSend({
    from: FROM_EMAIL,
    to: [TEAM_EMAIL],
    reply_to: d.email,
    subject: `New ${d.form_type} — ${d.name}`,
    html: teamHtml(d),
  })

  // 3) Branded customer confirmation (delivers to any address once a domain is verified in Resend).
  await resendSend({
    from: FROM_EMAIL,
    to: [d.email],
    subject: "We've received your request — FlyUp Line",
    html: customerHtml(d),
  })

  if (storeOk || teamOk) return res.status(200).json({ ok: true })
  return res.status(502).json({ error: 'Could not process the request. Please contact us directly.' })
}
