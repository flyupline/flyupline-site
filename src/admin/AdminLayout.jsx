import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { apiGet, apiPost } from '../lib/adminApi.js'
import { fromNow } from './ui.jsx'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const bellRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const { notifications, unread } = await apiGet('/api/admin/notifications')
      setNotifs(notifications)
      setUnread(unread)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: refresh notifications when any change lands.
  useEffect(() => {
    if (!supabase) return
    const ch = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  useEffect(() => {
    const onDoc = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const openNotif = async (n) => {
    if (!n.read) {
      await apiPost('/api/admin/notifications', { id: n.id }).catch(() => {})
      load()
    }
    setOpen(false)
    if (n.request_id) navigate(`/admin/quotes/${n.request_id}`)
  }

  const markAll = async () => {
    await apiPost('/api/admin/notifications', { action: 'read_all' }).catch(() => {})
    load()
  }

  return (
    <div className="admin-app">
      <header className="admin-topbar">
        <Link to="/admin" className="admin-logo">
          <img src="/assets/img/logo2.png" alt="FlyUp Line" />
          <span>Admin</span>
        </Link>
        <div className="admin-topbar-right">
          <div className="notif" ref={bellRef}>
            <button className="notif-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.268 21a2 2 0 0 0 3.464 0" />
                <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
              </svg>
              {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
            </button>
            {open && (
              <div className="notif-panel">
                <div className="notif-head">
                  <strong>Notifications</strong>
                  {unread > 0 && <button onClick={markAll}>Mark all read</button>}
                </div>
                <div className="notif-list">
                  {notifs.length === 0 && <div className="notif-empty">You're all caught up.</div>}
                  {notifs.map((n) => (
                    <button key={n.id} className={`notif-item${n.read ? '' : ' unread'}`} onClick={() => openNotif(n)}>
                      <div className="notif-title">{n.title}</div>
                      {n.body && <div className="notif-body">{n.body}</div>}
                      <div className="notif-time">{fromNow(n.created_at)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="admin-user">
            <span className="admin-email">{user?.email}</span>
            <button
              className="admin-logout"
              onClick={async () => {
                await logout()
                navigate('/admin/login')
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
