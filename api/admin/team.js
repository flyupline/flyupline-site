import { requireAdmin, sendError } from '../../server/auth.js'
import { readBody, SITE_URL } from '../../server/util.js'
import { CAPABILITIES, ROLE_DEFAULTS, effectivePermissions, requireCap } from '../../server/permissions.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BAN_FOREVER = '876000h' // ~100 years

async function listAll(db) {
  const { data: rows } = await db.from('admin_users').select('user_id, full_name, role, created_at').order('created_at')
  const { data: authList } = await db.auth.admin.listUsers({ page: 1, perPage: 500 })
  const byId = Object.fromEntries((authList?.users || []).map((u) => [u.id, u]))
  return { rows: rows || [], byId }
}

function shape(r, au, meId) {
  const bannedUntil = au?.banned_until ? new Date(au.banned_until) : null
  return {
    user_id: r.user_id,
    full_name: r.full_name,
    role: r.role,
    email: au?.email || '—',
    phone: au?.phone || null,
    created_at: r.created_at,
    account_created_at: au?.created_at || null,
    last_sign_in_at: au?.last_sign_in_at || null,
    confirmed: !!(au?.email_confirmed_at || au?.confirmed_at),
    provider: au?.app_metadata?.provider || 'email',
    suspended: !!(bannedUntil && bannedUntil > new Date()),
    is_you: r.user_id === meId,
    overrides: r.permissions || {},
    permissions: effectivePermissions(r.role, r.permissions),
  }
}

const ROLES = new Set(['owner', 'admin', 'moderator'])

export default async function handler(req, res) {
  try {
    const ctx = await requireAdmin(req)
    const { db, user } = ctx

    // ---------------------------------------------------------------- LIST
    // Anyone signed in can see the team; only team.manage can change it.
    if (req.method === 'GET') {
      const { rows, byId } = await listAll(db)
      return res.status(200).json({
        members: rows.map((r) => shape(r, byId[r.user_id], user.id)),
        capabilities: CAPABILITIES,
        roleDefaults: ROLE_DEFAULTS,
        me: { role: ctx.role, permissions: ctx.permissions },
      })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const body = readBody(req)
    const target = body.userId

    // Renaming yourself is always allowed; everything else needs team.manage.
    const selfRename = body.action === 'rename' && (!target || target === user.id)
    if (!selfRename) requireCap(ctx, 'team.manage')

    // Guard helpers for anything that touches another admin's access.
    const notSelf = (msg) => {
      if (target === user.id) throw Object.assign(new Error(msg), { status: 400 })
    }
    const keepOneAdmin = async () => {
      const { count } = await db.from('admin_users').select('user_id', { count: 'exact', head: true })
      if ((count || 0) <= 1) throw Object.assign(new Error('At least one admin must remain.'), { status: 400 })
    }

    switch (body.action) {
      // -------------------------------------------------------------- INVITE
      case 'invite': {
        const email = String(body.email || '').trim().toLowerCase()
        const fullName = String(body.full_name || '').trim().slice(0, 100)
        const role = ROLES.has(body.role) ? body.role : 'moderator'
        if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })

        const { data: authList } = await db.auth.admin.listUsers({ page: 1, perPage: 500 })
        const existing = (authList?.users || []).find((u) => (u.email || '').toLowerCase() === email)
        if (existing) {
          const { data: already } = await db.from('admin_users').select('user_id').eq('user_id', existing.id).maybeSingle()
          if (already) return res.status(409).json({ error: 'That person already has admin access.' })
          await db.from('admin_users').insert({ user_id: existing.id, full_name: fullName || existing.email, role })
          await db.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: `${SITE_URL}/admin` } }).catch(() => {})
          return res.status(200).json({ ok: true, reinstated: true })
        }

        const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITE_URL}/admin/reset` })
        if (error) return res.status(400).json({ error: error.message || 'Could not send the invite.' })
        const newId = data?.user?.id
        if (!newId) return res.status(500).json({ error: 'Invite sent but no user was returned.' })
        await db.from('admin_users').insert({ user_id: newId, full_name: fullName || email, role })
        return res.status(200).json({ ok: true, invited: true })
      }

      // --------------------------------------------------------- SEND A LINK
      case 'resend': {
        const email = String(body.email || '').trim().toLowerCase()
        if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email.' })
        const { error } = await db.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: `${SITE_URL}/admin` } })
        if (error) return res.status(400).json({ error: error.message })
        return res.status(200).json({ ok: true })
      }

      // ------------------------------------------------------ PASSWORD RESET
      case 'reset_password': {
        const email = String(body.email || '').trim().toLowerCase()
        if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email.' })
        const { error } = await db.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: `${SITE_URL}/admin/reset` } })
        if (error) return res.status(400).json({ error: error.message })
        return res.status(200).json({ ok: true })
      }

      // ------------------------------------------------------------- RENAME
      case 'rename': {
        const name = String(body.full_name || '').trim().slice(0, 100)
        if (!name) return res.status(400).json({ error: 'Name cannot be empty.' })
        await db.from('admin_users').update({ full_name: name }).eq('user_id', target || user.id)
        return res.status(200).json({ ok: true })
      }

      // ----------------------------------------------------------- SET ROLE
      case 'set_role': {
        if (!target) return res.status(400).json({ error: 'Missing user.' })
        if (!ROLES.has(body.role)) return res.status(400).json({ error: 'Unknown role.' })
        // Changing a role resets any per-user overrides back to the role defaults.
        await db.from('admin_users').update({ role: body.role, permissions: {} }).eq('user_id', target)
        return res.status(200).json({ ok: true })
      }

      // -------------------------------------------------- SET ONE PERMISSION
      case 'set_permission': {
        if (!target) return res.status(400).json({ error: 'Missing user.' })
        const key = String(body.capability || '')
        if (!CAPABILITIES.some((c) => c.key === key)) return res.status(400).json({ error: 'Unknown permission.' })
        if (target === user.id && key === 'team.manage' && body.value === false) {
          return res.status(400).json({ error: 'You cannot remove your own permission to manage people.' })
        }
        const { data: row } = await db.from('admin_users').select('role, permissions').eq('user_id', target).maybeSingle()
        if (!row) return res.status(404).json({ error: 'Person not found.' })
        const overrides = { ...(row.permissions || {}) }
        const roleDefault = (ROLE_DEFAULTS[row.role] || {})[key]
        // Store an override only when it differs from the role default.
        if (Boolean(body.value) === Boolean(roleDefault)) delete overrides[key]
        else overrides[key] = Boolean(body.value)
        await db.from('admin_users').update({ permissions: overrides }).eq('user_id', target)
        return res.status(200).json({ ok: true })
      }

      // ----------------------------------------------- RESET TO ROLE DEFAULTS
      case 'reset_permissions': {
        if (!target) return res.status(400).json({ error: 'Missing user.' })
        await db.from('admin_users').update({ permissions: {} }).eq('user_id', target)
        return res.status(200).json({ ok: true })
      }

      // ------------------------------------------------- SUSPEND / REINSTATE
      case 'suspend': {
        if (!target) return res.status(400).json({ error: 'Missing user.' })
        notSelf('You cannot suspend your own account.')
        const { error } = await db.auth.admin.updateUserById(target, { ban_duration: BAN_FOREVER })
        if (error) return res.status(400).json({ error: error.message })
        return res.status(200).json({ ok: true })
      }
      case 'unsuspend': {
        if (!target) return res.status(400).json({ error: 'Missing user.' })
        const { error } = await db.auth.admin.updateUserById(target, { ban_duration: 'none' })
        if (error) return res.status(400).json({ error: error.message })
        return res.status(200).json({ ok: true })
      }

      // ------------------------------------------------------ REMOVE ACCESS
      case 'remove': {
        if (!target) return res.status(400).json({ error: 'Missing user.' })
        notSelf('You cannot remove your own admin access.')
        await keepOneAdmin()
        await db.from('admin_users').delete().eq('user_id', target)
        return res.status(200).json({ ok: true })
      }

      // -------------------------------------------------- DELETE ACCOUNT
      case 'delete_user': {
        if (!target) return res.status(400).json({ error: 'Missing user.' })
        notSelf('You cannot delete your own account.')
        await keepOneAdmin()
        await db.from('admin_users').delete().eq('user_id', target)
        const { error } = await db.auth.admin.deleteUser(target)
        if (error) return res.status(400).json({ error: error.message })
        return res.status(200).json({ ok: true })
      }

      default:
        return res.status(400).json({ error: 'Unknown action' })
    }
  } catch (err) {
    sendError(res, err)
  }
}
