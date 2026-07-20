import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../lib/adminApi.js'
import { supabase } from '../../lib/supabase.js'
import { StatusBadge, ALL_STATUSES, STATUS_META, money, fmtDate, fmtDateTime, fromNow } from '../../admin/ui.jsx'
import QuoteBuilder from '../../admin/QuoteBuilder.jsx'
import QuoteDisplay from '../../components/quote/QuoteDisplay.jsx'
import { SITE } from '../../lib/site.js'

export default function RequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [d, setD] = useState(null)
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(null)
  const [note, setNote] = useState('')
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await apiGet('/api/admin/request?id=' + id)
      setD(res)
    } catch (e) {
      if (e.status === 404) navigate('/admin')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!supabase) return
    const ch = supabase
      .channel('req-' + id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log', filter: `request_id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `request_id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_responses', filter: `request_id=eq.${id}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [id, load])

  const act = async (body, label) => {
    setBusy(label || 'x')
    try {
      const r = await apiPost('/api/admin/action', { requestId: id, ...body })
      if (r.deleted) return navigate('/admin')
      await load()
    } catch (e) {
      alert(e.message || 'Action failed')
    } finally {
      setBusy('')
    }
  }

  if (loading) return <div className="admin-empty"><div className="admin-spinner" /></div>
  if (!d) return null

  const r = d.request
  const p = r.payload || {}

  return (
    <div className="admin-page detail">
      <div className="detail-top">
        <Link to="/admin" className="back-link">← All requests</Link>
        <div className="detail-title">
          <h1>{r.reference}</h1>
          <StatusBadge status={r.status} />
        </div>
        <div className="detail-actions">
          <select value={r.status} onChange={(e) => act({ action: 'set_status', status: e.target.value })}>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          <button onClick={() => act({ action: 'assign', self: true }, 'assign')} disabled={busy === 'assign'}>Assign to me</button>
          <button onClick={() => act({ action: 'set_status', status: 'booked' })}>Mark booked</button>
          <button onClick={() => { if (confirm('Cancel this request?')) act({ action: 'set_status', status: 'cancelled' }) }}>Cancel</button>
          <button onClick={() => act({ action: 'archive', archived: !r.archived })}>{r.archived ? 'Unarchive' : 'Archive'}</button>
          <button className="danger" onClick={() => { if (confirm('Permanently delete this request and all its data? This cannot be undone.')) act({ action: 'delete', confirm: true }) }}>Delete</button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <QuoteBuilder key={(d.versions.find((v) => v.status === 'draft')?.id) || 'new'} request={r} versions={d.versions} options={d.options} onReload={load} onPreview={setPreview} />

          <section className="panel-card">
            <h3>Quote versions</h3>
            {d.versions.length === 0 ? <p className="muted">No quotes created yet.</p> : (
              <table className="mini-table">
                <thead><tr><th>Version</th><th>Status</th><th>Total</th><th>Created</th><th>Sent</th><th></th></tr></thead>
                <tbody>
                  {d.versions.map((v) => (
                    <tr key={v.id}>
                      <td>v{v.version_number}</td>
                      <td><StatusBadge status={v.status === 'draft' ? 'draft_quote' : v.status === 'sent' ? 'quote_sent' : v.status} /></td>
                      <td>{money(v.total_price, v.currency)}</td>
                      <td>{fmtDate(v.created_at)}</td>
                      <td>{v.sent_at ? fmtDate(v.sent_at) : '—'}</td>
                      <td>{v.token && <a href={`${SITE}/quote/${v.token}`} target="_blank" rel="noreferrer">Open link ↗</a>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="panel-card">
            <h3>Customer conversation</h3>
            <div className="msg-thread">
              {d.messages.length === 0 && <p className="muted">No messages yet.</p>}
              {d.messages.map((m) => (
                <div key={m.id} className={`msg ${m.sender}`}>
                  <div className="msg-meta">{m.sender === 'admin' ? m.author_name || 'FlyUp Line' : d.request.full_name || 'Customer'} · {fromNow(m.created_at)}</div>
                  <div className="msg-body">{m.body}</div>
                </div>
              ))}
            </div>
            <div className="msg-compose">
              <textarea rows={2} placeholder="Write a message to the customer (sent by email)…" value={reply} onChange={(e) => setReply(e.target.value)} />
              <button className="btn btn-primary" disabled={!reply.trim() || busy === 'msg'} onClick={async () => { await act({ action: 'send_message', body: reply }, 'msg'); setReply('') }}>Send</button>
            </div>
          </section>
        </div>

        <aside className="detail-side">
          <section className="panel-card">
            <h3>Customer</h3>
            <CustomerEditor r={r} onSave={(patch) => act({ action: 'edit_customer', ...patch }, 'cust')} busy={busy === 'cust'} />
          </section>

          <section className="panel-card">
            <h3>Trip request</h3>
            <dl className="kv">
              <dt>Type</dt><dd>{r.form_type}</dd>
              {(p.route || []).map((leg, i) => (
                <div key={'r' + i} style={{ display: 'contents' }}>
                  <dt>Route {i + 1}</dt>
                  <dd>{leg}</dd>
                </div>
              ))}
              <dt>Dates</dt><dd>{(p.dates || []).join(' · ') || '—'}</dd>
              <dt>Travellers</dt><dd>{(p.travelers || []).join(', ') || '—'}</dd>
              <dt>Cabin</dt><dd>{p.cabin || '—'}</dd>
              {r.notes && <><dt>Notes</dt><dd>{r.notes}</dd></>}
              <dt>Submitted</dt><dd>{fmtDateTime(r.created_at)}</dd>
              <dt>Assigned</dt><dd>{d.admins.find((a) => a.user_id === r.assigned_admin)?.full_name || '—'}</dd>
            </dl>
          </section>

          <section className="panel-card">
            <h3>Internal notes <span className="muted">(private)</span></h3>
            <div className="notes-list">
              {d.notes.length === 0 && <p className="muted">No internal notes.</p>}
              {d.notes.map((n) => (
                <div key={n.id} className="note">
                  <div className="note-meta">{n.author_name} · {fromNow(n.created_at)}</div>
                  <div>{n.body}</div>
                </div>
              ))}
            </div>
            <div className="msg-compose">
              <textarea rows={2} placeholder="Add a private note (customers never see this)…" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn btn-ghost" disabled={!note.trim() || busy === 'note'} onClick={async () => { await act({ action: 'add_note', body: note }, 'note'); setNote('') }}>Add note</button>
            </div>
          </section>

          <section className="panel-card">
            <h3>Activity</h3>
            <div className="timeline">
              {d.activity.map((a) => (
                <div key={a.id} className="tl-item">
                  <div className="tl-dot" />
                  <div>
                    <div className="tl-action">{a.action.replace(/_/g, ' ')}</div>
                    {a.detail && <div className="tl-detail">{a.detail}</div>}
                    <div className="tl-meta">{a.actor_name || a.actor} · {fmtDateTime(a.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {preview && (
        <div className="preview-overlay" onClick={() => setPreview(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-bar">
              <strong>Quote preview</strong>
              <button onClick={() => setPreview(null)}>Close ✕</button>
            </div>
            <div className="preview-body q-page-body">
              <QuoteDisplay data={preview} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CustomerEditor({ r, onSave, busy }) {
  const [edit, setEdit] = useState(false)
  const [f, setF] = useState({ full_name: r.full_name || '', email: r.email || '', phone: r.phone || '', preferred_contact: r.preferred_contact || '' })
  if (!edit) {
    return (
      <>
        <dl className="kv">
          <dt>Name</dt><dd>{r.full_name || '—'}</dd>
          <dt>Email</dt><dd>{r.email || '—'}</dd>
          <dt>Phone</dt><dd>{r.phone || '—'}</dd>
          {r.preferred_contact && <><dt>Prefers</dt><dd>{r.preferred_contact}</dd></>}
        </dl>
        <button className="btn btn-ghost" onClick={() => setEdit(true)}>Edit details</button>
      </>
    )
  }
  return (
    <div className="cust-edit">
      {['full_name', 'email', 'phone', 'preferred_contact'].map((k) => (
        <label className="qb-field" key={k}>
          <span>{k.replace('_', ' ')}</span>
          <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        </label>
      ))}
      <div className="qb-actions">
        <button className="btn btn-ghost" onClick={() => setEdit(false)}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={async () => { await onSave(f); setEdit(false) }}>Save</button>
      </div>
    </div>
  )
}
