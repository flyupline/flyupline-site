import { requireAdmin, sendError } from '../../server/auth.js'
import { readBody } from '../../server/util.js'

export default async function handler(req, res) {
  try {
    const { db } = await requireAdmin(req)

    if (req.method === 'GET') {
      const { data } = await db.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)
      const unread = (data || []).filter((n) => !n.read).length
      return res.status(200).json({ notifications: data || [], unread })
    }

    if (req.method === 'POST') {
      const body = readBody(req)
      if (body.action === 'read_all') {
        await db.from('notifications').update({ read: true }).eq('read', false)
      } else if (body.id) {
        await db.from('notifications').update({ read: true }).eq('id', body.id)
      }
      return res.status(200).json({ ok: true })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    sendError(res, err)
  }
}
