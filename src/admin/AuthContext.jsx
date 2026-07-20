import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let active = true

    const check = async (s) => {
      if (!s?.user) {
        if (active) setIsAdmin(false)
        return
      }
      const { data } = await supabase.from('admin_users').select('user_id').eq('user_id', s.user.id).maybeSingle()
      if (active) setIsAdmin(!!data)
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await check(data.session)
      if (active) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      check(s)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const login = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const logout = () => supabase.auth.signOut()

  return (
    <AuthCtx.Provider value={{ session, user: session?.user, isAdmin, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}
