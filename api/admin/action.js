import { requireAdmin, sendError } from '../../server/auth.js'
import { logActivity, notify, readBody, SITE_URL } from '../../server/util.js'
import { sendEmail, shell, esc } from '../../server/email.js'

const STATUSES = new Set([
  'new', 'reviewing', 'waiting_info', 'draft_quote', 'quote_ready', 'quote_sent',
  'viewed', 'changes_requested', 'accepted', 'declined', 'expired', 'booked', 'cancelled',
])

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { db, user, adminName } = await requireAdmin(req)
    const body = readBody(req)
    const { requestId, action } = body
    if (!requestId || !action) return res.status(400).json({ error: 'Missing requestId or action' })

    const { data: request } = await db.from('quote_requests').select('*').eq('id', requestId).maybeSingle()
    if (!request) return res.status(404).json({ error: 'Request not found' })

    switch (action) {
      case 'set_status': {
        if (!STATUSES.has(body.status)) return res.status(400).json({ error: 'Invalid status' })
        await db.from('quote_requests').update({ status: body.status }).eq('id', requestId)
        await logActivity(db, requestId, { action: 'status_changed', actor: 'admin', actorName: adminName, detail: `Status set to ${body.status}` })
        break
      }
      case 'assign': {
        const assignee = body.self ? user.id : body.adminId || null
        await db.from('quote_requests').update({ assigned_admin: assignee }).eq('id', requestId)
        await logActivity(db, requestId, { action: 'assigned', actor: 'admin', actorName: adminName, detail: assignee ? `Assigned to ${body.self ? adminName : 'admin'}` : 'Unassigned' })
        break
      }
      case 'archive': {
        await db.from('quote_requests').update({ archived: !!body.archived }).eq('id', requestId)
        await logActivity(db, requestId, { action: body.archived ? 'archived' : 'unarchived', actor: 'admin', actorName: adminName })
        break
      }
      case 'edit_customer': {
        const patch = {}
        for (const f of ['full_name', 'email', 'phone', 'preferred_contact']) if (f in body) patch[f] = body[f]
        await db.from('quote_requests').update(patch).eq('id', requestId)
        await logActivity(db, requestId, { action: 'customer_edited', actor: 'admin', actorName: adminName, detail: 'Customer details updated' })
        break
      }
      case 'add_note': {
        if (!body.body?.trim()) return res.status(400).json({ error: 'Empty note' })
        await db.from('internal_notes').insert({ request_id: requestId, author_id: user.id, author_name: adminName, body: body.body.trim() })
        await logActivity(db, requestId, { action: 'internal_note_added', actor: 'admin', actorName: adminName, detail: 'Private note' })
        break
      }
      case 'send_message': {
        if (!body.body?.trim()) return res.status(400).json({ error: 'Empty message' })
        await db.from('messages').insert({ request_id: requestId, sender: 'admin', author_id: user.id, author_name: adminName, body: body.body.trim() })
        await logActivity(db, requestId, { action: 'admin_message_sent', actor: 'admin', actorName: adminName, detail: 'Message to customer' })
        // email the customer
        if (request.email) {
          const tokenRow = await db.from('quote_versions').select('token').eq('request_id', requestId).not('token', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
          const link = tokenRow.data?.token ? `${SITE_URL}/quote/${tokenRow.data.token}` : SITE_URL
          await sendEmail({
            to: request.email,
            replyTo: 'flyupline.booking@gmail.com',
            subject: `A message about your trip — FlyUp Line (${request.reference})`,
            html: shell(`<h1 style="margin:0 0 14px;color:#111;font:700 22px Arial,sans-serif">A message from FlyUp Line</h1>
              <div style="background:#faf7f4;border-left:3px solid #FF6100;padding:14px 18px;margin:0 0 18px;border-radius:0 8px 8px 0;color:#444;font:15px/1.6 Arial,sans-serif">${esc(body.body.trim()).replace(/\n/g, '<br>')}</div>
              <p style="margin:0 0 18px;color:#444;font:15px Arial,sans-serif">Reference: <strong>${esc(request.reference)}</strong></p>
              <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:#FF6100"><a href="${link}" style="display:inline-block;padding:13px 30px;color:#fff;font:700 15px Arial,sans-serif;text-decoration:none;border-radius:999px">View Your Quote</a></td></tr></table>`),
          })
        }
        break
      }
      case 'delete': {
        if (!body.confirm) return res.status(400).json({ error: 'Confirmation required' })
        await db.from('quote_requests').delete().eq('id', requestId)
        return res.status(200).json({ ok: true, deleted: true })
      }
      default:
        return res.status(400).json({ error: 'Unknown action' })
    }

    const { data: updated } = await db.from('quote_requests').select('*').eq('id', requestId).maybeSingle()
    res.status(200).json({ ok: true, request: updated })
  } catch (err) {
    sendError(res, err)
  }
}
