import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../lib/adminApi.js'
import { supabase } from '../../lib/supabase.js'
import { StatusBadge, ALL_STATUSES, STATUS_META, fmtDate, fromNow } from '../../admin/ui.jsx'

const CARDS = [
  { key: 'total', label: 'Total requests' },
  { key: 'new', label: 'New' },
  { key: 'reviewing', label: 'Reviewing' },
  { key: 'quote_sent', label: 'Quotes sent' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
  { key: 'expired', label: 'Expired' },
  { key: 'booked', label: 'Booked' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState({ summary: {}, requests: [] })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', type: '', sort: 'newest', search: '', archived: false })

  const load = useCallback(async () => {
    const p = new URLSearchParams()
    if (filters.status) p.set('status', filters.status)
    if (filters.type) p.set('type', filters.type)
    if (filters.sort) p.set('sort', filters.sort)
    if (filters.search) p.set('search', filters.search)
    if (filters.archived) p.set('archived', 'true')
    try {
      const res = await apiGet('/api/admin/requests?' + p.toString())
      setData(res)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const t = setTimeout(load, filters.search ? 250 : 0)
    return () => clearTimeout(t)
  }, [load, filters.search])

  // Realtime: any change to requests refreshes the board.
  useEffect(() => {
    if (!supabase) return
    const ch = supabase
      .channel('admin-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests' }, () => load())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Quote requests</h1>
          <p className="muted">Manage every customer request and send personalised quotes.</p>
        </div>
      </div>

      <div className="stat-cards">
        {CARDS.map((c) => (
          <button
            key={c.key}
            className={`stat-card${filters.status === (c.key === 'total' ? '' : c.key) ? ' active' : ''}`}
            onClick={() => setFilters((f) => ({ ...f, status: c.key === 'total' ? '' : c.key }))}
            style={{ '--sc': c.key === 'total' ? '#FF6100' : STATUS_META[c.key]?.color }}
          >
            <span className="stat-num">{data.summary[c.key] || 0}</span>
            <span className="stat-label">{c.label}</span>
          </button>
        ))}
      </div>

      <div className="admin-toolbar">
        <input className="admin-search" placeholder="Search reference, name, email, destination…" value={filters.search} onChange={set('search')} />
        <select value={filters.status} onChange={set('status')}>
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
        <select value={filters.type} onChange={set('type')}>
          <option value="">All types</option>
          <option value="Roundtrip flight quote request">Roundtrip</option>
          <option value="One-way flight quote request">One-way</option>
          <option value="Multi-city flight quote request">Multi-city</option>
          <option value="Contact enquiry">Contact</option>
        </select>
        <select value={filters.sort} onChange={set('sort')}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="updated">Recently updated</option>
        </select>
        <label className="admin-check">
          <input type="checkbox" checked={filters.archived} onChange={(e) => setFilters((f) => ({ ...f, archived: e.target.checked }))} />
          Archived
        </label>
      </div>

      {loading ? (
        <div className="admin-empty"><div className="admin-spinner" /></div>
      ) : data.requests.length === 0 ? (
        <div className="admin-empty">
          <h3>No requests found</h3>
          <p className="muted">New customer requests will appear here automatically.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Dates</th>
                <th>Travellers</th>
                <th>Type</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Assigned</th>
              </tr>
            </thead>
            <tbody>
              {data.requests.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/admin/quotes/${r.id}`)}>
                  <td data-label="Reference"><span className="ref">{r.reference}</span></td>
                  <td data-label="Customer">
                    <div className="cell-name">{r.full_name || '—'}</div>
                    <div className="cell-sub">{r.email}</div>
                    {r.phone && <div className="cell-sub">{r.phone}</div>}
                  </td>
                  <td data-label="Route">{r.origin || r.destination ? `${r.origin || '?'} → ${r.destination || '?'}` : '—'}</td>
                  <td data-label="Dates">{r.dates || '—'}</td>
                  <td data-label="Travellers">{r.travelers || '—'}</td>
                  <td data-label="Type">{(r.form_type || '').replace(' flight quote request', '').replace(' enquiry', '')}</td>
                  <td data-label="Status"><StatusBadge status={r.status} /></td>
                  <td data-label="Submitted" title={fmtDate(r.created_at)}>{fromNow(r.created_at)}</td>
                  <td data-label="Assigned">{r.assigned_name || <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
