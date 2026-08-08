import { requireAdmin, sendError } from '../../server/auth.js'
import { readBody } from '../../server/util.js'

const str = (v, max = 200) => (v == null ? '' : String(v).trim().slice(0, max))

export default async function handler(req, res) {
  try {
    const { db, user } = await requireAdmin(req)

    // ----------------------------------------------------------------- READ
    if (req.method === 'GET') {
      const { data: settings } = await db.from('app_settings').select('*').eq('id', 1).maybeSingle()

      // Live stats for the System tab.
      const { data: rows } = await db.from('quote_requests').select('status, archived')
      const byStatus = {}
      let archived = 0
      for (const r of rows || []) {
        byStatus[r.status] = (byStatus[r.status] || 0) + 1
        if (r.archived) archived++
      }
      const { count: versionsSent } = await db
        .from('quote_versions')
        .select('id', { count: 'exact', head: true })
        .not('sent_at', 'is', null)
      const { count: admins } = await db.from('admin_users').select('user_id', { count: 'exact', head: true })
      const { count: unread } = await db
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('read', false)

      // Scheduled maintenance job (expiry sweep + expiring notifications).
      let cron = null
      try {
        const { data } = await db.rpc('maintenance_status')
        cron = data || null
      } catch {
        cron = null
      }

      return res.status(200).json({
        settings: {
          business: settings?.business || {},
          quote_defaults: settings?.quote_defaults || {},
          updated_at: settings?.updated_at || null,
        },
        stats: {
          total: (rows || []).length,
          archived,
          byStatus,
          quotesSent: versionsSent || 0,
          admins: admins || 0,
          unreadNotifications: unread || 0,
        },
        health: {
          database: true,
          email: Boolean(process.env.RESEND_API_KEY),
          fromEmail: process.env.FROM_EMAIL || null,
          teamEmail: process.env.TEAM_EMAIL || null,
          siteUrl: process.env.PUBLIC_SITE_URL || null,
          cron,
        },
      })
    }

    // ---------------------------------------------------------------- WRITE
    if (req.method === 'POST') {
      const body = readBody(req)
      const patch = { updated_by: user.id }

      if (body.business && typeof body.business === 'object') {
        const b = body.business
        patch.business = {
          name: str(b.name, 120),
          email: str(b.email, 160),
          phone: str(b.phone, 40),
          phone_alt: str(b.phone_alt, 40),
          website: str(b.website, 160),
          address: str(b.address, 300),
          hours: str(b.hours, 120),
        }
      }

      if (body.quote_defaults && typeof body.quote_defaults === 'object') {
        const q = body.quote_defaults
        const days = Number(q.validityDays)
        patch.quote_defaults = {
          currency: str(q.currency, 8) || 'USD',
          validityDays: Number.isFinite(days) ? Math.min(120, Math.max(1, Math.round(days))) : 3,
          expiryTime: /^\d{2}:\d{2}$/.test(str(q.expiryTime, 5)) ? str(q.expiryTime, 5) : '23:59',
          terms: str(q.terms, 4000),
          defaultBaggage: str(q.defaultBaggage, 40),
        }
      }

      const { error } = await db.from('app_settings').update(patch).eq('id', 1)
      if (error) throw error

      const { data: settings } = await db.from('app_settings').select('business, quote_defaults, updated_at').eq('id', 1).maybeSingle()
      return res.status(200).json({ ok: true, settings })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    sendError(res, err)
  }
}
