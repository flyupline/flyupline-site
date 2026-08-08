import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../lib/adminApi.js'
import { useAuth } from '../../admin/AuthContext.jsx'
import { fmtDate, fmtDateTime, fromNow, STATUS_META } from '../../admin/ui.jsx'

/* ------------------------------------------------------------- shared bits */
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

const Card = ({ title, desc, children, footer }) => (
  <section className="set-card">
    <header className="set-card-head">
      <h3>{title}</h3>
      {desc && <p>{desc}</p>}
    </header>
    <div className="set-card-body">{children}</div>
    {footer && <footer className="set-card-foot">{footer}</footer>}
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
            <Field label="Email address" hint="Your sign-in address. Contact support to change it.">
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
function PeopleTab({ members, reload }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, flash] = useFlash()

  const invite = async (e) => {
    e.preventDefault()
    setBusy('invite')
    try {
      const r = await apiPost('/api/admin/team', { action: 'invite', email, full_name: name })
      setEmail('')
      setName('')
      flash(r.reinstated ? 'Admin access restored — a sign-in link was emailed.' : 'Invite sent. They’ll receive a secure link to set their password.')
      reload()
    } catch (err) {
      flash(err.message || 'Could not send the invite.', false)
    } finally {
      setBusy('')
    }
  }

  const act = async (m, action) => {
    if (action === 'remove' && !confirm(`Remove admin access for ${m.email}? They will no longer be able to sign in.`)) return
    setBusy(m.user_id)
    try {
      await apiPost('/api/admin/team', action === 'remove' ? { action: 'remove', userId: m.user_id } : { action: 'resend', email: m.email })
      flash(action === 'remove' ? 'Admin access removed.' : 'A fresh sign-in link was emailed.')
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
  const pending = members.filter((m) => !m.last_sign_in_at).length

  return (
    <div className="set-grid wide">
      <Card
        title={`Team members (${members.length})`}
        desc={pending ? `${pending} invitation${pending === 1 ? '' : 's'} not yet accepted.` : 'Everyone here can sign in and manage quotes.'}
      >
        <Flash msg={msg} />
        {members.length > 4 && (
          <input className="set-search" placeholder="Search people…" value={q} onChange={(e) => setQ(e.target.value)} />
        )}
        <div className="team-list">
          {members.length === 0 && <p className="muted">Loading team…</p>}
          {shown.map((m) => (
            <div className="team-row" key={m.user_id}>
              <div className="team-avatar">{(m.full_name || m.email || '?').slice(0, 2).toUpperCase()}</div>
              <div className="team-info">
                <div className="team-email">{m.full_name || m.email}</div>
                <div className="team-meta">
                  {m.full_name ? `${m.email} · ` : ''}added {fmtDate(m.created_at)}
                  {m.last_sign_in_at ? ` · active ${fromNow(m.last_sign_in_at)}` : ' · never signed in'}
                </div>
              </div>
              <div className="team-tags">
                <span className="team-badge">{m.role === 'owner' ? 'Owner' : 'Admin'}</span>
                {m.is_you && <span className="team-badge you">You</span>}
                {!m.last_sign_in_at && <span className="team-badge pending">Pending</span>}
              </div>
              {!m.is_you && (
                <div className="team-actions">
                  <button className="team-remove" disabled={busy === m.user_id} onClick={() => act(m, 'resend')}>Send link</button>
                  <button className="team-remove danger" disabled={busy === m.user_id} onClick={() => act(m, 'remove')}>Remove</button>
                </div>
              )}
            </div>
          ))}
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
          <button className="btn btn-primary" disabled={busy === 'invite' || !email}>
            {busy === 'invite' ? 'Sending…' : 'Send invite'}
          </button>
        </form>
      </Card>
    </div>
  )
}

/* ----------------------------------------------------------------- BUSINESS */
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AED', 'EGP', 'SAR']

function BusinessTab({ settings, save, saving }) {
  const [b, setB] = useState(settings.business || {})
  useEffect(() => setB(settings.business || {}), [settings.business])
  const set = (k) => (e) => setB({ ...b, [k]: e.target.value })

  return (
    <div className="set-grid">
      <Card title="Business profile" desc="Used on your quotes and customer emails so everyone sends consistent details.">
        <form
          className="set-form"
          onSubmit={(e) => {
            e.preventDefault()
            save({ business: b })
          }}
        >
          <Field label="Business name"><input value={b.name || ''} onChange={set('name')} placeholder="FlyUp Line" /></Field>
          <Field label="Booking email"><input type="email" value={b.email || ''} onChange={set('email')} placeholder="flyupline.booking@gmail.com" /></Field>
          <div className="set-row">
            <Field label="Phone"><input value={b.phone || ''} onChange={set('phone')} placeholder="+20 120 529 5295" /></Field>
            <Field label="Alternate phone"><input value={b.phone_alt || ''} onChange={set('phone_alt')} placeholder="Optional" /></Field>
          </div>
          <Field label="Website"><input value={b.website || ''} onChange={set('website')} placeholder="https://flyupline.com" /></Field>
          <Field label="Opening hours"><input value={b.hours || ''} onChange={set('hours')} placeholder="24 / 7" /></Field>
          <Field label="Address"><textarea rows={2} value={b.address || ''} onChange={set('address')} placeholder="Optional" /></Field>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save business profile'}</button>
        </form>
      </Card>
    </div>
  )
}

/* ----------------------------------------------------------------- DEFAULTS */
function DefaultsTab({ settings, save, saving }) {
  const [d, setD] = useState({ currency: 'USD', validityDays: 3, expiryTime: '23:59', terms: '', ...(settings.quote_defaults || {}) })
  useEffect(() => setD((prev) => ({ ...prev, ...(settings.quote_defaults || {}) })), [settings.quote_defaults])

  return (
    <div className="set-grid">
      <Card title="Quote defaults" desc="Every new quote starts with these, so you type less. Shared with your whole team.">
        <form
          className="set-form"
          onSubmit={(e) => {
            e.preventDefault()
            save({ quote_defaults: d })
          }}
        >
          <div className="set-row">
            <Field label="Default currency">
              <select value={d.currency} onChange={(e) => setD({ ...d, currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Valid for (days)" hint="Sets the expiry date on new quotes.">
              <input type="number" min="1" max="120" value={d.validityDays} onChange={(e) => setD({ ...d, validityDays: Number(e.target.value) || 1 })} />
            </Field>
            <Field label="Expiry time" hint="Time of day the quote lapses.">
              <input type="time" value={d.expiryTime || '23:59'} onChange={(e) => setD({ ...d, expiryTime: e.target.value })} />
            </Field>
          </div>
          <Field label="Default terms & conditions" hint="Appears on every quote unless you change it while building.">
            <textarea rows={5} value={d.terms || ''} onChange={(e) => setD({ ...d, terms: e.target.value })} placeholder="Optional" />
          </Field>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save defaults'}</button>
        </form>
      </Card>

      <Card title="Always included" desc="This notice is shown on every quote and in every quote email. It can’t be removed.">
        <div className="set-readonly">
          Please note that the price of the tickets and the availability of seats are not guaranteed until ticketed.
          Please approve at the earliest to proceed.
        </div>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------- SYSTEM */
function StatusPill({ ok, label }) {
  return (
    <span className={`sys-pill ${ok === null ? 'unknown' : ok ? 'ok' : 'bad'}`}>
      <span className="dot" />
      {label}
    </span>
  )
}

function SystemTab({ stats, health }) {
  const s = stats || {}
  const byStatus = s.byStatus || {}
  const cards = [
    { label: 'Total requests', value: s.total || 0 },
    { label: 'Quotes sent', value: s.quotesSent || 0 },
    { label: 'Accepted', value: byStatus.accepted || 0 },
    { label: 'Booked', value: byStatus.booked || 0 },
    { label: 'Awaiting reply', value: (byStatus.quote_sent || 0) + (byStatus.viewed || 0) },
    { label: 'Team members', value: s.admins || 0 },
  ]
  return (
    <>
      <div className="sys-stats">
        {cards.map((c) => (
          <div className="sys-stat" key={c.label}>
            <span className="sys-num">{c.value}</span>
            <span className="sys-label">{c.label}</span>
          </div>
        ))}
      </div>

      <div className="set-grid">
        <Card title="Service health" desc="Live status of the systems that power your quotes.">
          <div className="sys-rows">
            <div className="sys-row">
              <div><strong>Database</strong><span>Stores requests, quotes and activity</span></div>
              <StatusPill ok={health?.database} label={health?.database ? 'Connected' : 'Unavailable'} />
            </div>
            <div className="sys-row">
              <div><strong>Email delivery</strong><span>{health?.fromEmail || 'Sends quotes and notifications'}</span></div>
              <StatusPill ok={health?.email} label={health?.email ? 'Active' : 'Not configured'} />
            </div>
            <div className="sys-row">
              <div><strong>Scheduled maintenance</strong><span>{health?.cron?.schedule ? `Runs hourly (${health.cron.schedule}) — expires old quotes` : 'Expires old quotes automatically'}</span></div>
              <StatusPill ok={health?.cron?.enabled ?? null} label={health?.cron?.enabled ? 'Running' : health?.cron?.enabled === false ? 'Stopped' : 'Unknown'} />
            </div>
            <div className="sys-row">
              <div><strong>Public site</strong><span>{health?.siteUrl || '—'}</span></div>
              <StatusPill ok={Boolean(health?.siteUrl)} label={health?.siteUrl ? 'Live' : 'Unknown'} />
            </div>
          </div>
        </Card>

        <Card title="Request breakdown" desc="Where every request currently sits.">
          <div className="sys-breakdown">
            {Object.entries(byStatus).length === 0 && <p className="muted">No requests yet.</p>}
            {Object.entries(byStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <div className="sys-bd-row" key={k}>
                  <span className="sys-bd-dot" style={{ background: STATUS_META[k]?.color || '#888' }} />
                  <span className="sys-bd-label">{STATUS_META[k]?.label || k}</span>
                  <span className="sys-bd-val">{v}</span>
                </div>
              ))}
            {s.archived > 0 && (
              <div className="sys-bd-row">
                <span className="sys-bd-dot" style={{ background: '#555' }} />
                <span className="sys-bd-label">Archived</span>
                <span className="sys-bd-val">{s.archived}</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}

/* --------------------------------------------------------------------- page */
const TABS = [
  { id: 'account', label: 'Account' },
  { id: 'people', label: 'People' },
  { id: 'business', label: 'Business' },
  { id: 'defaults', label: 'Quote defaults' },
  { id: 'system', label: 'System' },
]

export default function Settings() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'account'
  const setTab = (id) => setParams(id === 'account' ? {} : { tab: id }, { replace: true })

  const [members, setMembers] = useState([])
  const [settings, setSettings] = useState({ business: {}, quote_defaults: {} })
  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, flash] = useFlash()

  const loadTeam = useCallback(async () => {
    try {
      const { members } = await apiGet('/api/admin/team')
      setMembers(members)
    } catch {
      /* handled by tab UI */
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const r = await apiGet('/api/admin/settings')
      setSettings(r.settings)
      setStats(r.stats)
      setHealth(r.health)
      cacheQuoteDefaults(r.settings.quote_defaults)
    } catch {
      /* handled by tab UI */
    }
  }, [])

  useEffect(() => {
    loadTeam()
    loadSettings()
  }, [loadTeam, loadSettings])

  const save = async (patch) => {
    setSaving(true)
    try {
      const r = await apiPost('/api/admin/settings', patch)
      setSettings(r.settings)
      cacheQuoteDefaults(r.settings.quote_defaults)
      flash('Saved.')
    } catch (err) {
      flash(err.message || 'Could not save.', false)
    } finally {
      setSaving(false)
    }
  }

  const me = members.find((m) => m.is_you) || { full_name: '', role: 'admin' }

  return (
    <div className="admin-page settings-page">
      <div className="admin-page-head">
        <h1>Settings</h1>
        <p className="muted">Your account, your team, and how FlyUp Line quotes behave.</p>
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
          <Flash msg={msg} />
          {tab === 'account' && <AccountTab me={{ ...me, email: user?.email }} onRenamed={loadTeam} />}
          {tab === 'people' && <PeopleTab members={members} reload={loadTeam} />}
          {tab === 'business' && <BusinessTab settings={settings} save={save} saving={saving} />}
          {tab === 'defaults' && <DefaultsTab settings={settings} save={save} saving={saving} />}
          {tab === 'system' && <SystemTab stats={stats} health={health} />}
          {settings.updated_at && (tab === 'business' || tab === 'defaults') && (
            <p className="set-updated">Last updated {fmtDateTime(settings.updated_at)}</p>
          )}
        </div>
      </div>
    </div>
  )
}
