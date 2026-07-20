import { adminDb } from '../server/supabase.js'
import { logActivity, notify } from '../server/util.js'
import { sendEmail, adminAlertHtml, TEAM_EMAIL } from '../server/email.js'

// Public endpoint: fetch a quote by its secure token. Returns ONLY the data a
// customer may see (no internal notes, no IP data, no other requests).
export default async function handler(req, res) {
  try {
    const token = (req.query || {}).token
    if (!token || token.length < 20) return res.status(400).json({ error: 'Invalid quote link' })

    const db = adminDb()
    await db.rpc('mark_expired_quotes')

    const { data: version } = await db.from('quote_versions').select('*').eq('token', token).maybeSingle()
    if (!version) return res.status(404).json({ error: 'This quote link is invalid or has been removed.' })

    const { data: request } = await db.from('quote_requests').select('id, reference, full_name, email, phone, payload, status').eq('id', version.request_id).maybeSingle()
    const { data: options } = await db.from('quote_options').select('id, sort_order, title, description, travelers, flights, hotels, package, pricing, total_price').eq('version_id', version.id).order('sort_order')
    const { data: messages } = await db.from('messages').select('sender, author_name, body, created_at').eq('request_id', version.request_id).order('created_at')
    const { data: responses } = await db.from('customer_responses').select('type, option_id, created_at').eq('version_id', version.id).order('created_at', { ascending: false })

    // First view: sent -> viewed (+ notify admin), unless already responded/terminal.
    if (version.status === 'sent') {
      await db.from('quote_versions').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', version.id)
      if (['quote_sent'].includes(request?.status)) {
        await db.from('quote_requests').update({ status: 'viewed' }).eq('id', version.request_id)
      }
      await logActivity(db, version.request_id, { action: 'customer_viewed_quote', actor: 'customer', actorName: request?.full_name, detail: `Version ${version.version_number}` })
      await notify(db, version.request_id, { type: 'viewed', title: `Quote viewed — ${request?.full_name || 'Customer'}`, body: `${request?.reference} · v${version.version_number}` })
      await sendEmail({ to: TEAM_EMAIL, subject: `Quote viewed — ${request?.reference}`, html: adminAlertHtml({ heading: 'Customer viewed their quote', lines: [['Reference', request?.reference], ['Customer', request?.full_name], ['Version', version.version_number]] }) })
      version.status = 'viewed'
    }

    const safe = {
      reference: request?.reference,
      customerName: request?.full_name,
      origin: (request?.payload?.route?.[0] || '').split('→')[0]?.trim() || '',
      destination: (request?.payload?.route?.[0] || '').split('→')[1]?.trim() || '',
      route: request?.payload?.route || [],
      dates: request?.payload?.dates || [],
      travelers: request?.payload?.travelers || [],
      version: {
        version_number: version.version_number,
        status: version.status,
        currency: version.currency,
        customer_message: version.customer_message,
        terms: version.terms,
        travel_notes: version.travel_notes,
        required_documents: version.required_documents,
        payment_instructions: version.payment_instructions,
        contact_info: version.contact_info,
        expires_at: version.expires_at,
        booking_deadline: version.booking_deadline,
        sent_at: version.sent_at,
      },
      options: options || [],
      messages: messages || [],
      responded: (responses || [])[0] || null,
      expired: version.status === 'expired',
    }
    res.status(200).json(safe)
  } catch (err) {
    res.status(500).json({ error: 'Could not load this quote. Please try again or contact us.' })
  }
}
