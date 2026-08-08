import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../lib/adminApi.js'
import { useAuth } from '../../admin/AuthContext.jsx'
import { fmtDate, fromNow } from '../../admin/ui.jsx'

function Flash({ msg }) {
  if (!msg) return null
  return <div className={`admin-alert ${msg.ok ? 'ok' : 'error'}`}>{msg.text}</div>
}

/* ------------------------------------------------------------- my account */
function AccountCard() {
  const { user, updatePassword } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 5000) }

  const save = async (e) => {
    e.preventDefault()
    if (pw.length < 8) return flash('Use at least 8 characters.', false)
    if (pw !== pw2) return flash('The two passwords do not match.', false)
    setBusy(true)
    const { error } = await updatePassword(pw)
    setBusy(false)
    if (error) return flash(error.message || 'Could not update password.', false)
    setPw(''); setPw2('')
    flash('Password updated. Use it next time you sign in.')
  }

  return (
    <section className="settings-card">
      <h3>My account</h3>
      <span className="muted">Signed in as {user?.email}</span>
      <Flash msg={msg} />
      <form className="settings-form" onSubmit={save}>
        <label className="qb-field">
          <span>New password</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" />
        </label>
        <label className="qb-field">
          <span>Confirm new password</span>
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        </label>
        <button className="btn btn-primary" disabled={busy || !pw}>{busy ? 'Saving…' : 'Change password'}</button>
      </form>
    </section>
  )
}

/* ------------------------------------------------------------------ team */
function TeamCard() {
  const [members, setMembers] = useState([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)
  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 6000) }

  const load = useCallback(async () => {
    try {
      const { members } = await apiGet('/api/admin/team')
      setMembers(members)
    } catch (e) {
      flash(e.message || 'Could not load the team.', false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const invite = async (e) => {
    e.preventDefault()
    setBusy('invite')
    try {
      const r = await apiPost('/api/admin/team', { action: 'invite', email, full_name: name })
      setEmail(''); setName('')
      flash(r.reinstated ? 'Admin access restored — a sign-in link was emailed.' : 'Invite sent. They’ll get an email with a secure link to set their password.')
      load()
    } catch (e) {
      flash(e.message || 'Could not send the invite.', false)
    } finally {
      setBusy('')
    }
  }

  const remove = async (m) => {
    if (!confirm(`Remove admin access for ${m.email}? They will no longer be able to sign in to the admin area.`)) return
    setBusy(m.user_id)
    try {
      await apiPost('/api/admin/team', { action: 'remove', userId: m.user_id })
      flash('Admin access removed.')
      load()
    } catch (e) {
      flash(e.message || 'Could not remove.', false)
    } finally {
      setBusy('')
    }
  }

  const resend = async (m) => {
    setBusy(m.user_id)
    try {
      await apiPost('/api/admin/team', { action: 'resend', email: m.email })
      flash('A fresh sign-in link was emailed.')
    } catch (e) {
      flash(e.message || 'Could not resend.', false)
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="settings-card">
      <h3>Team &amp; access</h3>
      <span className="muted">Everyone listed here can sign in to the admin area and manage quotes.</span>
      <Flash msg={msg} />

      <div className="team-list">
        {members.length === 0 && <p className="muted">Loading team…</p>}
        {members.map((m) => (
          <div className="team-row" key={m.user_id}>
            <div className="team-avatar">{(m.full_name || m.email || '?').slice(0, 2).toUpperCase()}</div>
            <div className="team-info">
              <div className="team-email">{m.email}</div>
              <div className="team-meta">
                {m.full_name || 'Admin'} · added {fmtDate(m.created_at)}
                {m.last_sign_in_at ? ` · last seen ${fromNow(m.last_sign_in_at)}` : ' · never signed in'}
              </div>
            </div>
            {m.is_you && <span className="team-badge you">You</span>}
            {!m.last_sign_in_at && !m.is_you && <span className="team-badge pending">Pending</span>}
            {!m.is_you && (
              <>
                <button className="team-remove" disabled={busy === m.user_id} onClick={() => resend(m)}>Send link</button>
                <button className="team-remove" disabled={busy === m.user_id} onClick={() => remove(m)}>Remove</button>
              </>
            )}
          </div>
        ))}
      </div>

      <form className="settings-form" onSubmit={invite}>
        <label className="qb-field">
          <span>Invite by email (magic link)</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@flyupline.com" />
        </label>
        <label className="qb-field">
          <span>Their name (optional)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sara" />
        </label>
        <button className="btn btn-primary" disabled={busy === 'invite' || !email}>{busy === 'invite' ? 'Sending…' : 'Send invite'}</button>
      </form>
    </section>
  )
}

/* -------------------------------------------------------------- defaults */
const DEFAULTS_KEY = 'flyupline.quoteDefaults'
export function loadQuoteDefaults() {
  try {
    return JSON.parse(localStorage.getItem(DEFAULTS_KEY) || '{}')
  } catch {
    return {}
  }
}

function DefaultsCard() {
  const [d, setD] = useState(() => ({ currency: 'USD', validityDays: 3, terms: '', ...loadQuoteDefaults() }))
  const [msg, setMsg] = useState(null)
  const save = (e) => {
    e.preventDefault()
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(d))
    setMsg({ ok: true, text: 'Defaults saved — new quotes will start with these.' })
    setTimeout(() => setMsg(null), 4000)
  }
  return (
    <section className="settings-card">
      <h3>Quote defaults</h3>
      <span className="muted">Pre-fill every new quote so you type less. Saved on this device.</span>
      <Flash msg={msg} />
      <form className="settings-form" onSubmit={save}>
        <label className="qb-field">
          <span>Default currency</span>
          <select value={d.currency} onChange={(e) => setD({ ...d, currency: e.target.value })}>
            {['USD', 'EUR', 'GBP', 'CAD', 'AED', 'EGP', 'SAR'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="qb-field">
          <span>Quote valid for (days)</span>
          <input type="number" min="1" max="60" value={d.validityDays} onChange={(e) => setD({ ...d, validityDays: Number(e.target.value) || 1 })} />
        </label>
        <label className="qb-field">
          <span>Default terms &amp; conditions</span>
          <textarea rows={3} value={d.terms} onChange={(e) => setD({ ...d, terms: e.target.value })} placeholder="Optional — appears on every quote unless you change it." />
        </label>
        <button className="btn btn-primary">Save defaults</button>
      </form>
    </section>
  )
}

export default function Settings() {
  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Settings</h1>
        <p className="muted">Manage your account, your team, and quote defaults.</p>
      </div>
      <div className="settings-grid">
        <AccountCard />
        <TeamCard />
        <DefaultsCard />
      </div>
    </div>
  )
}
