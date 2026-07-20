import { requireAdmin, sendError } from '../../server/auth.js'
import { logActivity } from '../../server/util.js'

export default async function handler(req, res) {
  try {
    const { db, adminName } = await requireAdmin(req)
    const id = (req.query || {}).id
    if (!id) return res.status(400).json({ error: 'Missing id' })

    await db.rpc('mark_expired_quotes')

    const { data: request, error } = await db.from('quote_requests').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!request) return res.status(404).json({ error: 'Not found' })

    // First open moves New -> Reviewing.
    if (request.status === 'new') {
      await db.from('quote_requests').update({ status: 'reviewing' }).eq('id', id)
      await logActivity(db, id, { action: 'request_opened', actor: 'admin', actorName: adminName, detail: 'Status set to Reviewing' })
      request.status = 'reviewing'
    }

    const [versions, options, responses, messages, notes, activity, admins] = await Promise.all([
      db.from('quote_versions').select('*').eq('request_id', id).order('version_number', { ascending: false }),
      db.from('quote_options').select('*').eq('request_id', id).order('sort_order', { ascending: true }),
      db.from('customer_responses').select('*').eq('request_id', id).order('created_at', { ascending: false }),
      db.from('messages').select('*').eq('request_id', id).order('created_at', { ascending: true }),
      db.from('internal_notes').select('*').eq('request_id', id).order('created_at', { ascending: false }),
      db.from('activity_log').select('*').eq('request_id', id).order('created_at', { ascending: false }).limit(200),
      db.from('admin_users').select('user_id, full_name'),
    ])

    res.status(200).json({
      request,
      versions: versions.data || [],
      options: options.data || [],
      responses: responses.data || [],
      messages: messages.data || [],
      notes: notes.data || [],
      activity: activity.data || [],
      admins: admins.data || [],
    })
  } catch (err) {
    sendError(res, err)
  }
}
