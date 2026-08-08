import { requireAdmin, sendError } from '../../server/auth.js'
import { readBody, SITE_URL } from '../../server/util.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req, res) {
  try {
    const { db, user, adminName } = await requireAdmin(req)

    // ---------------------------------------------------------------- LIST
    if (req.method === 'GET') {
      const { data: rows } = await db.from('admin_users').select('user_id, full_name, role, created_at').order('created_at')
      const { data: authList } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
      const byId = Object.fromEntries((authList?.users || []).map((u) => [u.id, u]))
      const members = (rows || []).map((r) => {
        const au = byId[r.user_id]
        return {
          user_id: r.user_id,
          full_name: r.full_name,
          role: r.role,
          email: au?.email || '—',
          created_at: r.created_at,
          last_sign_in_at: au?.last_sign_in_at || null,
          confirmed: !!(au?.email_confirmed_at || au?.confirmed_at),
          is_you: r.user_id === user.id,
        }
      })
      return res.status(200).json({ members })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const body = readBody(req)

    // -------------------------------------------------------------- INVITE
    if (body.action === 'invite') {
      const email = String(body.email || '').trim().toLowerCase()
      const fullName = String(body.full_name || '').trim().slice(0, 100)
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })

      // Already an admin?
      const { data: authList } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
      const existing = (authList?.users || []).find((u) => (u.email || '').toLowerCase() === email)
      if (existing) {
        const { data: already } = await db.from('admin_users').select('user_id').eq('user_id', existing.id).maybeSingle()
        if (already) return res.status(409).json({ error: 'That person is already an admin.' })
        // Existing auth user (e.g. previously removed) — re-grant + send a sign-in link.
        await db.from('admin_users').insert({ user_id: existing.id, full_name: fullName || existing.email, role: 'admin' })
        await db.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: `${SITE_URL}/admin` } }).catch(() => {})
        return res.status(200).json({ ok: true, reinstated: true })
      }

      // New person — Supabase sends the branded invite (magic link) email.
      const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITE_URL}/admin/reset` })
      if (error) return res.status(400).json({ error: error.message || 'Could not send the invite.' })
      const newId = data?.user?.id
      if (!newId) return res.status(500).json({ error: 'Invite sent but no user was returned.' })
      await db.from('admin_users').insert({ user_id: newId, full_name: fullName || email, role: body.role === 'owner' ? 'owner' : 'admin' })
      return res.status(200).json({ ok: true, invited: true })
    }

    // -------------------------------------------------------- RESEND INVITE
    if (body.action === 'resend') {
      const email = String(body.email || '').trim().toLowerCase()
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email.' })
      const { error } = await db.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: `${SITE_URL}/admin` } })
      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    // -------------------------------------------------------------- REMOVE
    if (body.action === 'remove') {
      const target = body.userId
      if (!target) return res.status(400).json({ error: 'Missing user.' })
      if (target === user.id) return res.status(400).json({ error: 'You cannot remove your own admin access.' })
      const { count } = await db.from('admin_users').select('user_id', { count: 'exact', head: true })
      if ((count || 0) <= 1) return res.status(400).json({ error: 'At least one admin must remain.' })
      await db.from('admin_users').delete().eq('user_id', target)
      return res.status(200).json({ ok: true })
    }

    // ------------------------------------------------------------ SET NAME
    if (body.action === 'rename') {
      const name = String(body.full_name || '').trim().slice(0, 100)
      if (!name) return res.status(400).json({ error: 'Name cannot be empty.' })
      await db.from('admin_users').update({ full_name: name }).eq('user_id', body.userId || user.id)
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    sendError(res, err)
  }
}
