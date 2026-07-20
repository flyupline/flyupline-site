import { adminDb } from '../server/supabase.js'
import { logActivity, notify, readBody } from '../server/util.js'
import { sendEmail, adminAlertHtml, TEAM_EMAIL } from '../server/email.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const clean = (v, max = 300) => (v == null ? '' : String(v).trim().slice(0, max))

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const body = readBody(req)
    const token = clean(body.token, 200)
    const type = body.type
    if (!token || token.length < 20) return res.status(400).json({ error: 'Invalid quote link' })
    if (!['accept', 'decline', 'request_changes', 'message'].includes(type)) return res.status(400).json({ error: 'Invalid action' })

    const db = adminDb()
    await db.rpc('mark_expired_quotes').catch(() => {})

    const { data: version } = await db.from('quote_versions').select('*').eq('token', token).maybeSingle()
    if (!version) return res.status(404).json({ error: 'This quote link is invalid.' })
    const { data: request } = await db.from('quote_requests').select('*').eq('id', version.request_id).maybeSingle()

    // Terminal-state guards.
    if (['accepted', 'booked'].includes(request?.status) && type === 'accept') {
      return res.status(409).json({ error: 'This quote has already been accepted. Our team will be in touch.' })
    }
    if (version.status === 'expired' && type === 'accept') {
      return res.status(410).json({ error: 'This quote has expired. Please contact us for an updated quote.' })
    }

    const rid = version.request_id
    const name = clean(body.full_name, 120)
    const email = clean(body.email, 160)

    if (type === 'accept') {
      if (!name || name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' })
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' })
      if (!body.agreed_terms) return res.status(400).json({ error: 'Please agree to the terms and conditions.' })
      if (!body.optionId) return res.status(400).json({ error: 'Please choose an option to accept.' })
      const { data: opt } = await db.from('quote_options').select('id, title, total_price').eq('id', body.optionId).eq('version_id', version.id).maybeSingle()
      if (!opt) return res.status(400).json({ error: 'Selected option not found.' })

      await db.from('customer_responses').insert({
        request_id: rid, version_id: version.id, option_id: opt.id, type: 'accept',
        full_name: name, email, phone: clean(body.phone, 40), agreed_terms: true, total_accepted: opt.total_price,
      })
      await db.from('quote_versions').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', version.id)
      await db.from('quote_requests').update({ status: 'accepted' }).eq('id', rid)
      await logActivity(db, rid, { action: 'customer_accepted', actor: 'customer', actorName: name, detail: `Accepted "${opt.title}"`, meta: { optionId: opt.id, versionId: version.id, total: opt.total_price } })
      await notify(db, rid, { type: 'accepted', title: `Quote ACCEPTED — ${name}`, body: `${request.reference} · ${opt.title}` })
      await sendEmail({ to: TEAM_EMAIL, subject: `✅ Quote accepted — ${request.reference}`, html: adminAlertHtml({ heading: 'A customer accepted their quote', lines: [['Reference', request.reference], ['Customer', name], ['Email', email], ['Phone', clean(body.phone, 40)], ['Option', opt.title], ['Total', opt.total_price != null ? `${version.currency} ${opt.total_price}` : '']] }) })
      return res.status(200).json({ ok: true, type })
    }

    if (type === 'decline') {
      await db.from('customer_responses').insert({ request_id: rid, version_id: version.id, type: 'decline', full_name: request?.full_name, email: request?.email, decline_reason: clean(body.reason, 500), message: clean(body.message, 1000) })
      await db.from('quote_versions').update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', version.id)
      await db.from('quote_requests').update({ status: 'declined' }).eq('id', rid)
      await logActivity(db, rid, { action: 'customer_declined', actor: 'customer', actorName: request?.full_name, detail: clean(body.reason, 200) || 'No reason given' })
      await notify(db, rid, { type: 'declined', title: `Quote declined — ${request?.full_name}`, body: `${request.reference} · ${clean(body.reason, 80) || 'no reason'}` })
      await sendEmail({ to: TEAM_EMAIL, subject: `Quote declined — ${request.reference}`, html: adminAlertHtml({ heading: 'A customer declined their quote', lines: [['Reference', request.reference], ['Customer', request?.full_name], ['Reason', clean(body.reason, 300)], ['Message', clean(body.message, 500)]] }) })
      return res.status(200).json({ ok: true, type })
    }

    if (type === 'request_changes' || type === 'message') {
      const msg = clean(body.message, 2000)
      if (!msg) return res.status(400).json({ error: 'Please enter a message.' })
      await db.from('messages').insert({ request_id: rid, sender: 'customer', author_name: request?.full_name, body: msg })
      if (type === 'request_changes') {
        await db.from('customer_responses').insert({ request_id: rid, version_id: version.id, type: 'request_changes', full_name: request?.full_name, email: request?.email, message: msg })
        await db.from('quote_versions').update({ status: 'changes_requested', responded_at: new Date().toISOString() }).eq('id', version.id)
        await db.from('quote_requests').update({ status: 'changes_requested' }).eq('id', rid)
      }
      const label = type === 'request_changes' ? 'requested changes' : 'sent a message'
      await logActivity(db, rid, { action: type === 'request_changes' ? 'customer_requested_changes' : 'customer_message', actor: 'customer', actorName: request?.full_name, detail: msg.slice(0, 200) })
      await notify(db, rid, { type: type === 'request_changes' ? 'changes' : 'message', title: `Customer ${label} — ${request?.full_name}`, body: `${request.reference}: ${msg.slice(0, 80)}` })
      await sendEmail({ to: TEAM_EMAIL, replyTo: request?.email, subject: `Customer ${label} — ${request.reference}`, html: adminAlertHtml({ heading: `Customer ${label}`, lines: [['Reference', request.reference], ['Customer', request?.full_name], ['Message', msg]] }) })
      return res.status(200).json({ ok: true, type })
    }

    res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    res.status(500).json({ error: 'Could not submit your response. Please try again or contact us.' })
  }
}
