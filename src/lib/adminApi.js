import { supabase } from './supabase.js'

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function parse(res) {
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(json.error || res.statusText), { status: res.status })
  return json
}

export async function apiGet(path) {
  return parse(await fetch(path, { headers: await authHeaders() }))
}
export async function apiPost(path, body) {
  return parse(await fetch(path, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(body) }))
}

// Public (no auth) — customer quote page.
export async function publicGet(path) {
  return parse(await fetch(path))
}
export async function publicPost(path, body) {
  return parse(await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
}
