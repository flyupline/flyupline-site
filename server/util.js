import crypto from 'node:crypto'

export const genReference = () => 'FUL-' + crypto.randomBytes(3).toString('hex').toUpperCase()
export const genToken = () => crypto.randomBytes(24).toString('base64url')

export async function logActivity(db, requestId, { action, actor = 'system', actorName = null, detail = null, meta = {} }) {
  await db.from('activity_log').insert({ request_id: requestId, action, actor, actor_name: actorName, detail, meta })
}

export async function notify(db, requestId, { type, title, body = null }) {
  await db.from('notifications').insert({ request_id: requestId, type, title, body })
}

export const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://flyupline.com'

// Read + JSON-parse a request body regardless of how Vercel delivered it.
export function readBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body
}
