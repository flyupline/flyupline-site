import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../lib/adminApi.js'
import { useAuth } from '../../admin/AuthContext.jsx'
import { fmtDate, fmtDateTime, fromNow } from '../../admin/ui.jsx'

/* Quote defaults are kept per-device so new quotes still pre-fill sensibly. */
const DEFAULTS_KEY = 'flyupline.quoteDefaults'
export function loadQuoteDefaults() {
  try {
    return JSON.parse(localStorage.getItem(DEFAULTS_KEY) || '{}')
  } catch {
    return {}
  }
}
export function cacheQuoteDefaults(d) {
  try {
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(d || {}))
  } catch {
    /* ignore */
  }
}

function useFlash() {
  const [msg, setMsg] = useState(null)
  const timer = useRef(null)
  const flash = (text, ok = true) => {
    setMsg({ text, ok })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), 5000)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  return [msg, flash]
}

const Flash = ({ msg }) => (msg ? <div className={`admin-alert ${msg.ok ? 'ok' : 'error'}`}>{msg.text}</div> : null)

const Field = ({ label, hint, children }) => (
  <label className="set-field">
    <span className="set-label">{label}</span>
    {children}
    {hint && <span className="set-hint">{hint}</span>}
  </label>
)

const Card = ({ title, desc, children }) => (
  <section className="set-card">
    <header className="set-card-head">
      <h3>{title}</h3>
      {desc && <p>{desc}</p>}
    </header>
    <div className="set-card-body">{children}</div>
  </section>
)

/* ------------------------------------------------------------------ ACCOUNT */
function AccountTab({ me, onRenamed }) {
  const { user, updatePassword } = useAuth()
  const [name, setName] = useState(me?.full_name || '')
  const [savingName, setSavingName] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [msg, flash] = useFlash()
  const [pwMsg, pwFlash] = useFlash()

  useEffect(() => setName(me?.full_name || ''), [me?.full_name])

  const saveName = async (e) => {
    e.preventDefault()
    setSavingName(true)
    try {
      await apiPost('/api/admin/team', { action: 'rename', full_name: name })
      flash('Profile updated.')
      onRenamed?.()
    } catch (err) {
      flash(err.message || 'Could not save.', false)
    } finally {
      setSavingName(false)
    }
  }

  const savePw = async (e) => {
    e.preventDefault()
    if (pw.length < 8) return pwFlash('Use at least 8 characters.', false)
    if (pw !== pw2) return pwFlash('The two passwords do not match.', false)
    setSavingPw(true)
    const { error } = await updatePassword(pw)
    setSavingPw(false)
    if (error) return pwFlash(error.message || 'Could not update password.', false)
    setPw('')
    setPw2('')
    pwFlash('Password updated. Use it next time you sign in.')
  }

  const initials = (me?.full_name || user?.email || '?').slice(0, 2).toUpperCase()

  return (
    <>
      <div className="profile-head">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-meta">
          <h2>{me?.full_name || 'Admin'}</h2>
          <p>{user?.email}</p>
          <div className="profile-badges">
            <span className="team-badge you">{me?.role === 'owner' ? 'Owner' : 'Admin'}</span>
            {me?.created_at && <span className="team-badge">Member since {fmtDate(me.created_at)}</span>}
            {me?.last_sign_in_at && <span className="team-badge">Last sign-in {fromNow(me.last_sign_in_at)}</span>}
          </div>
        </div>
      </div>

      <div className="set-grid">
        <Card title="Profile" desc="This name appears on quotes you send and on your internal notes.">
          <Flash msg={msg} />
          <form className="set-form" onSubmit={saveName}>
            <Field label="Display name">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kirolos" />
            </Field>
            <Field label="Email address" hint="Your sign-in address.">
              <input value={user?.email || ''} disabled />
            </Field>
            <button className="btn btn-primary" disabled={savingName || !name.trim()}>
              {savingName ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </Card>

        <Card title="Password" desc="Change the password you use to sign in to the admin area.">
          <Flash msg={pwMsg} />
          <form className="set-form" onSubmit={savePw}>
            <Field label="New password" hint="At least 8 characters.">
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password">
              <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
            </Field>
            <button className="btn btn-primary" disabled={savingPw || !pw}>
              {savingPw ? 'Saving…' : 'Change password'}
            </button>
          </form>
        </Card>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------- PEOPLE */
const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', moderator: 'Moderator' }
const ROLE_HINT = {
  owner: 'Full control, including people & permissions.',
  admin: 'Manage requests and send quotes. Cannot manage people.',
  moderator: 'View requests and prepare drafts. Cannot send quotes.',
}

function PersonRow({ m, busy, onAct, expanded, onToggle, capabilities, roleDefaults, canManage }) {
  const [rename, setRename] = useState(m.full_name || '')
  useEffect(() => setRename(m.full_name || ''), [m.full_name])
  const defaults = roleDefaults?.[m.role] || {}

  return (
    <div className={`person${expanded ? ' open' : ''}${m.suspended ? ' suspended' : ''}`}>
      <button className="person-head" onClick={onToggle} aria-expanded={expanded}>
        <span className="team-avatar">{(m.full_name || m.email || '?').slice(0, 2).toUpperCase()}</span>
        <span className="person-id">
          <span className="person-name">{m.full_name || m.email}</span>
          <span className="person-email">{m.email}</span>
        </span>
        <span className="person-tags">
          <span className={`team-badge role-${m.role}`}>{ROLE_LABEL[m.role] || m.role}</span>
          {m.is_you && <span className="team-badge you">You</span>}
          {m.suspended && <span className="team-badge danger">Suspended</span>}
          {!m.last_sign_in_at && !m.suspended && <span className="team-badge pending">Pending</span>}
        </span>
        <span className="person-caret">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="person-body">
          <dl className="person-info">
            <div><dt>Email</dt><dd>{m.email}</dd></div>
            <div><dt>Role</dt><dd>{ROLE_LABEL[m.role] || m.role}</dd></div>
            <div><dt>Status</dt><dd>{m.suspended ? 'Suspended' : m.last_sign_in_at ? 'Active' : 'Invitation pending'}</dd></div>
            <div><dt>Last sign-in</dt><dd>{m.last_sign_in_at ? `${fmtDateTime(m.last_sign_in_at)} (${fromNow(m.last_sign_in_at)})` : 'Never'}</dd></div>
            <div><dt>Given access</dt><dd>{fmtDate(m.created_at)}</dd></div>
            {m.account_created_at && <div><dt>Account created</dt><dd>{fmtDate(m.account_created_at)}</dd></div>}
            <div><dt>Email confirmed</dt><dd>{m.confirmed ? 'Yes' : 'Not yet'}</dd></div>
            <div><dt>Sign-in method</dt><dd>{m.provider}</dd></div>
            {m.phone && <div><dt>Phone</dt><dd>{m.phone}</dd></div>}
            <div><dt>User ID</dt><dd className="mono">{m.user_id}</dd></div>
          </dl>

          {canManage && (
            <div className="perm-block">
              <div className="perm-head">
                <div>
                  <h5>Role &amp; permissions</h5>
                  <p>{ROLE_HINT[m.role]}</p>
                </div>
                <select value={m.role} disabled={busy} onChange={(e) => onAct('set_role', { role: e.target.value })}>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div className="perm-grid">
                {(capabilities || []).map((c) => {
                  const on = !!m.permissions?.[c.key]
                  const overridden = c.key in (m.overrides || {})
                  return (
                    <label key={c.key} className={`perm-item${overridden ? ' overridden' : ''}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={busy}
                        onChange={(e) => onAct('set_permission', { capability: c.key, value: e.target.checked })}
                      />
                      <span>
                        {c.label}
                        {overridden && <em> · custom</em>}
                      </span>
                    </label>
                  )
                })}
              </div>
              {Object.keys(m.overrides || {}).length > 0 && (
                <button className="team-remove" disabled={busy} onClick={() => onAct('reset_permissions')}>
                  Reset to {ROLE_LABEL[m.role]} defaults
                </button>
              )}
            </div>
          )}

          <div className="person-controls">
            <div className="person-rename">
              <input value={rename} onChange={(e) => setRename(e.target.value)} placeholder="Display name" />
              <button className="team-remove" disabled={busy || !rename.trim() || rename === m.full_name} onClick={() => onAct('rename', { full_name: rename })}>
                Save name
              </button>
            </div>

            <div className="person-actions">
              <button className="team-remove" disabled={busy} onClick={() => onAct('resend')}>Send sign-in link</button>
              <button className="team-remove" disabled={busy} onClick={() => onAct('reset_password')}>Send password reset</button>
              {!m.is_you && (
                <>
                  {m.suspended ? (
                    <button className="team-remove" disabled={busy} onClick={() => onAct('unsuspend')}>Reinstate</button>
                  ) : (
                    <button className="team-remove warn" disabled={busy} onClick={() => onAct('suspend', null, `Suspend ${m.email}? They will be signed out and blocked from signing in until reinstated.`)}>
                      Suspend
                    </button>
                  )}
                  <button className="team-remove danger" disabled={busy} onClick={() => onAct('remove', null, `Remove admin access for ${m.email}? Their account stays, but they can no longer sign in to the admin area.`)}>
                    Remove access
                  </button>
                  <button className="team-remove danger" disabled={busy} onClick={() => onAct('delete_user', null, `Permanently delete the account for ${m.email}? This cannot be undone.`)}>
                    Delete account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PeopleTab({ members, reload, capabilities, roleDefaults, canManage }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('moderator')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState('')
  const [openId, setOpenId] = useState(null)
  const [msg, flash] = useFlash()

  const invite = async (e) => {
    e.preventDefault()
    setBusy('invite')
    try {
      const r = await apiPost('/api/admin/team', { action: 'invite', email, full_name: name, role })
      setEmail('')
      setName('')
      flash(r.reinstated ? 'Access restored — a sign-in link was emailed.' : 'Invite sent. They’ll get a secure link to create their password and sign in.')
      reload()
    } catch (err) {
      flash(err.message || 'Could not send the invite.', false)
    } finally {
      setBusy('')
    }
  }

  const act = (m) => async (action, extra, confirmText) => {
    if (confirmText && !confirm(confirmText)) return
    setBusy(m.user_id)
    try {
      await apiPost('/api/admin/team', { action, userId: m.user_id, email: m.email, ...(extra || {}) })
      const done = {
        rename: 'Name updated.',
        set_role: 'Role updated.',
        resend: 'Sign-in link emailed.',
        reset_password: 'Password-reset email sent.',
        suspend: 'Account suspended.',
        unsuspend: 'Account reinstated.',
        remove: 'Admin access removed.',
        delete_user: 'Account deleted.',
      }
      flash(done[action] || 'Done.')
      reload()
    } catch (err) {
      flash(err.message || 'Action failed.', false)
    } finally {
      setBusy('')
    }
  }

  const shown = members.filter(
    (m) => !q || (m.email || '').toLowerCase().includes(q.toLowerCase()) || (m.full_name || '').toLowerCase().includes(q.toLowerCase())
  )
  const active = members.filter((m) => m.last_sign_in_at && !m.suspended).length
  const pending = members.filter((m) => !m.last_sign_in_at).length
  const suspended = members.filter((m) => m.suspended).length

  return (
    <>
      <div className="people-stats">
        <div className="people-stat"><span>{members.length}</span>Total</div>
        <div className="people-stat"><span>{active}</span>Active</div>
        <div className="people-stat"><span>{pending}</span>Pending</div>
        <div className="people-stat"><span>{suspended}</span>Suspended</div>
      </div>

      <div className="set-grid wide">
        <Card title="People with admin access" desc="Open anyone to see their full details and manage their access.">
          <Flash msg={msg} />
          {members.length > 3 && (
            <input className="set-search" placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
          )}
          <div className="people-list">
            {members.length === 0 && <p className="muted">Loading people…</p>}
            {shown.map((m) => (
              <PersonRow
                key={m.user_id}
                m={m}
                busy={busy === m.user_id}
                onAct={act(m)}
                expanded={openId === m.user_id}
                onToggle={() => setOpenId(openId === m.user_id ? null : m.user_id)}
                capabilities={capabilities}
                roleDefaults={roleDefaults}
                canManage={canManage}
              />
            ))}
            {members.length > 0 && shown.length === 0 && <p className="muted">No one matches “{q}”.</p>}
          </div>
        </Card>

        <Card title="Invite someone" desc="They’ll get an email with a secure magic link to set their password and join.">
          <form className="set-form" onSubmit={invite}>
            <Field label="Email address">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@flyupline.com" />
            </Field>
            <Field label="Their name" hint="Optional — shown on quotes they send.">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sara" />
            </Field>
            <Field label="Role" hint={ROLE_HINT[role]}>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </Field>
            <button className="btn btn-primary" disabled={busy === 'invite' || !email}>
              {busy === 'invite' ? 'Sending…' : 'Send invite'}
            </button>
          </form>
        </Card>
      </div>
    </>
  )
}

/* --------------------------------------------------------------------- page */
const TABS = [
  { id: 'account', label: 'Account' },
  { id: 'people', label: 'People' },
]

export default function Settings() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'account'
  const setTab = (id) => setParams(id === 'account' ? {} : { tab: id }, { replace: true })

  const [members, setMembers] = useState([])
  const [capabilities, setCapabilities] = useState([])
  const [roleDefaults, setRoleDefaults] = useState({})
  const [meCtx, setMeCtx] = useState(null)

  const loadTeam = useCallback(async () => {
    try {
      const r = await apiGet('/api/admin/team')
      setMembers(r.members)
      setCapabilities(r.capabilities || [])
      setRoleDefaults(r.roleDefaults || {})
      setMeCtx(r.me || null)
    } catch {
      /* surfaced in the tab UI */
    }
  }, [])

  useEffect(() => {
    loadTeam()
  }, [loadTeam])

  const me = members.find((m) => m.is_you) || { full_name: '', role: 'admin' }

  return (
    <div className="admin-page settings-page">
      <div className="admin-page-head">
        <h1>Settings</h1>
        <p className="muted">Your account and the people who can access this admin.</p>
      </div>

      <div className="set-shell">
        <nav className="set-tabs" aria-label="Settings sections">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : undefined} onClick={() => setTab(t.id)}>
              {t.label}
              {t.id === 'people' && members.length > 0 && <span className="set-tab-count">{members.length}</span>}
            </button>
          ))}
        </nav>

        <div className="set-content">
          {tab === 'account' && <AccountTab me={{ ...me, email: user?.email }} onRenamed={loadTeam} />}
          {tab === 'people' && (
            <PeopleTab
              members={members}
              reload={loadTeam}
              capabilities={capabilities}
              roleDefaults={roleDefaults}
              canManage={!!meCtx?.permissions?.['team.manage']}
            />
          )}
        </div>
      </div>
    </div>
  )
}
