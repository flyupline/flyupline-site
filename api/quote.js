// Vercel serverless function — receives a form submission, stores it in
// Supabase, emails the team a branded alert, and sends the customer a branded
// confirmation. Uses only native fetch (no dependencies).

const {
  RESEND_API_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TEAM_EMAIL = 'flyupline.booking@gmail.com',
  FROM_EMAIL = 'FlyUp Line <onboarding@resend.dev>',
} = process.env

const LOGO = 'https://flyupline.vercel.app/assets/img/logo2.png'
const BRAND = '#FF6100'

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const asArray = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v])

function summarize(body) {
  const froms = asArray(body['from[]'])
  const tos = asArray(body['to[]'])
  const legs = []
  for (let i = 0; i < Math.max(froms.length, tos.length); i++) {
    if (froms[i] || tos[i]) legs.push(`${froms[i] || '?'} → ${tos[i] || '?'}`)
  }
  const dates = ['multiCityDate1', 'multiCityDate2', 'multiCityDate3', 'multiCityDate4', 'onewaydate']
    .map((k) => body[k])
    .filter(Boolean)
  const travelers = []
  if (body.adult_quantity) travelers.push(`${body.adult_quantity} adult(s)`)
  if (body.child_quantity && body.child_quantity !== '0') travelers.push(`${body.child_quantity} child(ren)`)
  if (body.infant_quantity && body.infant_quantity !== '0') travelers.push(`${body.infant_quantity} infant(s)`)
  return { legs, dates, travelers, cabin: body.cabin_class }
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

function customerHtml(name, s) {
  const summary = rows([
    ['Route', s.legs.join('  •  ')],
    ['Dates', s.dates.join('  •  ')],
    ['Travelers', s.travelers.join(', ')],
    ['Cabin', s.cabin],
  ])
  return shell(`
    <h1 style="margin:0 0 14px;color:#111;font:700 24px Arial,sans-serif">Thank you${name ? ', ' + esc(name) : ''}!</h1>
    <p style="margin:0 0 16px;color:#444;font:16px/1.65 Arial,sans-serif">We've received your request and our travel experts are already searching for the best available flights for your trip. You'll receive personalized options and prices by email <strong>within 24 hours</strong>.</p>
    ${summary ? `<table role="presentation" width="100%" style="margin:6px 0 20px;border-top:1px solid #eee;border-bottom:1px solid #eee">${summary}</table>` : ''}
    <p style="margin:0;color:#444;font:16px/1.65 Arial,sans-serif">Need to add anything? Just reply to this email or call <a href="tel:+201205295295" style="color:${BRAND};text-decoration:none">+20 120 529 5295</a>.</p>
    <p style="margin:22px 0 0;color:#444;font:16px/1.65 Arial,sans-serif">Warm regards,<br><strong>The FlyUp Line Team</strong></p>
  `)
}

function teamHtml(body, s) {
  const name = body.fullname || body.name || ''
  const detail = rows([
    ['Type', body.form_type],
    ['Name', name],
    ['Email', body.email],
    ['Phone', body.phone],
    ['Route', s.legs.join('  •  ')],
    ['Dates', s.dates.join('  •  ')],
    ['Travelers', s.travelers.join(', ')],
    ['Cabin', s.cabin],
    ['Notes', body.message],
  ])
  return shell(`
    <h1 style="margin:0 0 16px;color:#111;font:700 22px Arial,sans-serif">New ${esc(body.form_type || 'request')}</h1>
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}

  // Honeypot: silently accept and drop bot submissions.
  if (body.botcheck) return res.status(200).json({ ok: true })

  const name = body.fullname || body.name || ''
  if (!body.email || !name) return res.status(400).json({ error: 'Please provide your name and email.' })

  const s = summarize(body)

  // 1) Store the request in Supabase.
  let storeOk = false
  try {
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/quote_requests`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          form_type: body.form_type || 'quote',
          full_name: name,
          email: body.email,
          phone: body.phone || null,
          notes: body.message || null,
          payload: body,
        }),
      })
      storeOk = r.ok
    }
  } catch {
    storeOk = false
  }

  // 2) Notify the team (reaches the account inbox today).
  const teamOk = await resendSend({
    from: FROM_EMAIL,
    to: [TEAM_EMAIL],
    reply_to: body.email,
    subject: `New ${body.form_type || 'request'} — ${name}`,
    html: teamHtml(body, s),
  })

  // 3) Send the customer a branded confirmation (activates once a domain is verified in Resend).
  await resendSend({
    from: FROM_EMAIL,
    to: [body.email],
    subject: "We've received your request — FlyUp Line",
    html: customerHtml(name, s),
  })

  // As long as we captured the request (stored or notified), report success.
  if (storeOk || teamOk) return res.status(200).json({ ok: true })
  return res.status(502).json({ error: 'Could not process the request. Please contact us directly.' })
}
