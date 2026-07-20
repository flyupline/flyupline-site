import { adminDb } from './supabase.js'

// Verifies the caller's Supabase access token AND that they are an admin.
// Throws { status } on failure. Returns a service-role db client + admin info.
export async function requireAdmin(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 })

  const db = adminDb()
  const { data: userData, error } = await db.auth.getUser(token)
  if (error || !userData?.user) throw Object.assign(new Error('Unauthorized'), { status: 401 })

  const { data: adminRow } = await db
    .from('admin_users')
    .select('user_id, full_name, role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!adminRow) throw Object.assign(new Error('Forbidden'), { status: 403 })

  return {
    db,
    user: userData.user,
    admin: adminRow,
    adminName: adminRow.full_name || userData.user.email,
  }
}

export function sendError(res, err) {
  const status = err?.status || 500
  res.status(status).json({ error: status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : err?.message || 'Server error' })
}
