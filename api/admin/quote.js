import { requireAdmin, sendError } from '../../server/auth.js'
import { logActivity, readBody, genToken, SITE_URL } from '../../server/util.js'
import { sendEmail, quoteEmailHtml } from '../../server/email.js'

const num = (v) => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v))
const firstName = (full) => (full || '').trim().split(/\s+/)[0] || ''
const destOf = (r) => {
  const leg = (r.payload?.route || [])[0] || ''
  const to = String(leg).split('→')[1]
  return (to || '').trim()
}
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

function optionTotals(options) {
  const totals = options.map((o) => num(o.total_price)).filter((n) => n != null)
  return totals.length ? Math.min(...totals) : null
}

async function replaceOptions(db, versionId, requestId, options) {
  await db.from('quote_options').delete().eq('version_id', versionId)
  if (options.length) {
    await db.from('quote_options').insert(
      options.map((o, i) => ({
        version_id: versionId,
        request_id: requestId,
        sort_order: i,
        title: o.title || `Option ${i + 1}`,
        description: o.description || null,
        travelers: o.travelers ? Number(o.travelers) : null,
        flights: Array.isArray(o.flights) ? o.flights : [],
        hotels: Array.isArray(o.hotels) ? o.hotels : [],
        package: o.package && typeof o.package === 'object' ? o.package : {},
        pricing: o.pricing && typeof o.pricing === 'object' ? o.pricing : {},
        total_price: num(o.total_price),
      }))
    )
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { db, user, adminName } = await requireAdmin(req)
    const body = readBody(req)
    const { action, requestId } = body

    const { data: request } = await db.from('quote_requests').select('*').eq('id', requestId).maybeSingle()
    if (!request) return res.status(404).json({ error: 'Request not found' })

    // ---------------------------------------------------------------- SAVE
    if (action === 'save') {
      const meta = body.meta || {}
      const options = Array.isArray(body.options) ? body.options : []
      const total = optionTotals(options)
      let versionId = body.versionId

      if (versionId) {
        const { data: v } = await db.from('quote_versions').select('status').eq('id', versionId).maybeSingle()
        if (!v) return res.status(404).json({ error: 'Version not found' })
        if (v.status !== 'draft') return res.status(400).json({ error: 'Only draft quotes can be edited. Use "revise" instead.' })
        await db.from('quote_versions').update({ ...cleanMeta(meta), total_price: total }).eq('id', versionId)
      } else {
        const { data: last } = await db.from('quote_versions').select('version_number').eq('request_id', requestId).order('version_number', { ascending: false }).limit(1).maybeSingle()
        const versionNumber = (last?.version_number || 0) + 1
        const { data: created, error } = await db
          .from('quote_versions')
          .insert({ request_id: requestId, version_number: versionNumber, status: 'draft', created_by: user.id, created_by_name: adminName, total_price: total, ...cleanMeta(meta) })
          .select('id')
          .single()
        if (error) throw error
        versionId = created.id
      }

      await replaceOptions(db, versionId, requestId, options)
      if (['new', 'reviewing', 'waiting_info'].includes(request.status)) {
        await db.from('quote_requests').update({ status: 'draft_quote' }).eq('id', requestId)
      }
      await logActivity(db, requestId, { action: 'quote_draft_saved', actor: 'admin', actorName: adminName, detail: `${options.length} option(s)` })
      return res.status(200).json({ ok: true, versionId })
    }

    // ---------------------------------------------------------------- SEND
    if (action === 'send') {
      const versionId = body.versionId
      const { data: version } = await db.from('quote_versions').select('*').eq('id', versionId).maybeSingle()
      if (!version) return res.status(404).json({ error: 'Version not found' })
      const { data: options } = await db.from('quote_options').select('*').eq('version_id', versionId).order('sort_order')
      if (!options?.length) return res.status(400).json({ error: 'Add at least one quote option before sending.' })

      const token = version.token || genToken()
      const total = optionTotals(options)
      await db.from('quote_versions').update({ status: 'sent', token, sent_at: new Date().toISOString(), total_price: total }).eq('id', versionId)
      // supersede older live versions
      await db.from('quote_versions').update({ status: 'superseded' }).eq('request_id', requestId).in('status', ['sent', 'viewed', 'changes_requested']).neq('id', versionId)
      await db.from('quote_requests').update({ status: 'quote_sent' }).eq('id', requestId)

      const quoteUrl = `${SITE_URL}/quote/${token}`
      const emailed = await sendEmail({
        to: request.email,
        replyTo: 'flyupline.booking@gmail.com',
        subject: `Your travel quote is ready — FlyUp Line (${request.reference})`,
        html: quoteEmailHtml({
          firstName: firstName(request.full_name),
          reference: request.reference,
          destination: destOf(request),
          dates: (request.payload?.dates || []).join(' · '),
          travelers: (request.payload?.travelers || []).join(', '),
          fromPrice: total,
          currency: version.currency,
          expiresAt: fmtDate(version.expires_at),
          message: version.customer_message,
          quoteUrl,
        }),
      })

      await logActivity(db, requestId, { action: 'quote_sent', actor: 'admin', actorName: adminName, detail: `Version ${version.version_number} sent`, meta: { versionId } })
      if (emailed) await logActivity(db, requestId, { action: 'email_delivered', actor: 'system', detail: `Quote email sent to ${request.email}` })
      return res.status(200).json({ ok: true, token, emailed })
    }

    // -------------------------------------------------------------- REVISE
    if (action === 'revise') {
      const versionId = body.versionId
      const { data: src } = await db.from('quote_versions').select('*').eq('id', versionId).maybeSingle()
      if (!src) return res.status(404).json({ error: 'Version not found' })
      const { data: srcOptions } = await db.from('quote_options').select('*').eq('version_id', versionId).order('sort_order')
      const { data: last } = await db.from('quote_versions').select('version_number').eq('request_id', requestId).order('version_number', { ascending: false }).limit(1).maybeSingle()

      const { data: created, error } = await db
        .from('quote_versions')
        .insert({
          request_id: requestId, version_number: (last?.version_number || 0) + 1, status: 'draft',
          created_by: user.id, created_by_name: adminName, previous_total: src.total_price,
          currency: src.currency, customer_message: src.customer_message, terms: src.terms,
          travel_notes: src.travel_notes, required_documents: src.required_documents,
          payment_instructions: src.payment_instructions, contact_info: src.contact_info,
        })
        .select('id')
        .single()
      if (error) throw error
      await replaceOptions(db, created.id, requestId, (srcOptions || []).map((o) => ({ ...o, total_price: o.total_price })))
      await db.from('quote_requests').update({ status: 'draft_quote' }).eq('id', requestId)
      await logActivity(db, requestId, { action: 'quote_revised', actor: 'admin', actorName: adminName, detail: `New draft from v${src.version_number}` })
      return res.status(200).json({ ok: true, versionId: created.id })
    }

    // ------------------------------------------------------- DELETE VERSION
    if (action === 'delete_version') {
      const { data: v } = await db.from('quote_versions').select('status, version_number').eq('id', body.versionId).maybeSingle()
      if (!v) return res.status(404).json({ error: 'Version not found' })
      if (v.status !== 'draft') return res.status(400).json({ error: 'Only draft quotes can be deleted.' })
      await db.from('quote_versions').delete().eq('id', body.versionId)
      await logActivity(db, requestId, { action: 'draft_deleted', actor: 'admin', actorName: adminName, detail: `Draft v${v.version_number} deleted` })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    sendError(res, err)
  }
}

function cleanMeta(meta) {
  const out = {}
  for (const f of ['currency', 'customer_message', 'terms', 'travel_notes', 'required_documents', 'payment_instructions', 'contact_info', 'changes_summary']) {
    if (f in meta) out[f] = meta[f] || null
  }
  for (const f of ['expires_at', 'booking_deadline']) {
    if (f in meta) out[f] = meta[f] || null
  }
  return out
}
