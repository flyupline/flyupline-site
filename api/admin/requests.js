import { requireAdmin, sendError } from '../../server/auth.js'

const firstLeg = (p) => (Array.isArray(p?.route) && p.route[0]) || ''
const parseLeg = (leg) => {
  const [from, to] = String(leg || '').split('→').map((s) => s.trim())
  return { from: from || '', to: to || '' }
}

export default async function handler(req, res) {
  try {
    const { db } = await requireAdmin(req)
    // Lazy expiry sweep before listing.
    await db.rpc('mark_expired_quotes').catch(() => {})

    const q = req.query || {}
    const archived = q.archived === 'true'

    const { data: rows, error } = await db
      .from('quote_requests')
      .select('id, reference, full_name, email, phone, status, form_type, payload, assigned_admin, archived, created_at, updated_at')
      .eq('archived', archived)
      .order('created_at', { ascending: false })
      .limit(2000)
    if (error) throw error

    const { data: admins } = await db.from('admin_users').select('user_id, full_name')
    const adminMap = Object.fromEntries((admins || []).map((a) => [a.user_id, a.full_name]))

    // Summary counts over the full (non-archived) set.
    const summary = { total: rows.length }
    for (const r of rows) summary[r.status] = (summary[r.status] || 0) + 1

    let list = rows.map((r) => {
      const leg = parseLeg(firstLeg(r.payload))
      return {
        ...r,
        assigned_name: r.assigned_admin ? adminMap[r.assigned_admin] || 'Admin' : null,
        origin: leg.from,
        destination: leg.to,
        dates: (r.payload?.dates || []).join(' · '),
        travelers: (r.payload?.travelers || []).join(', '),
      }
    })

    // Filters
    if (q.status) list = list.filter((r) => r.status === q.status)
    if (q.type) list = list.filter((r) => r.form_type === q.type)
    if (q.assigned) list = list.filter((r) => r.assigned_admin === q.assigned)
    if (q.destination) list = list.filter((r) => (r.destination || '').toLowerCase().includes(q.destination.toLowerCase()))
    if (q.search) {
      const s = q.search.toLowerCase()
      list = list.filter(
        (r) =>
          (r.reference || '').toLowerCase().includes(s) ||
          (r.full_name || '').toLowerCase().includes(s) ||
          (r.email || '').toLowerCase().includes(s) ||
          (r.destination || '').toLowerCase().includes(s) ||
          (r.origin || '').toLowerCase().includes(s)
      )
    }

    // Sort
    switch (q.sort) {
      case 'oldest':
        list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        break
      case 'updated':
        list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        break
      default:
        // 'newest' (default) already ordered
        break
    }

    res.status(200).json({ summary, requests: list })
  } catch (err) {
    sendError(res, err)
  }
}
