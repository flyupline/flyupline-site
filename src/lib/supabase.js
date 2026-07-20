import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// Browser client — uses the public anon key. All privileged reads/writes go
// through the server API (which verifies the admin role); RLS blocks anon.
export const supabase = url && anon ? createClient(url, anon) : null
