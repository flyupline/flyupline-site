import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. Server-side only (never shipped to browser).
export function adminDb() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
