export const STATUS_META = {
  new: { label: 'New', color: '#3b82f6' },
  reviewing: { label: 'Reviewing', color: '#8b5cf6' },
  waiting_info: { label: 'Waiting for info', color: '#eab308' },
  draft_quote: { label: 'Draft quote', color: '#9ca3af' },
  quote_ready: { label: 'Quote ready', color: '#06b6d4' },
  quote_sent: { label: 'Quote sent', color: '#FF6100' },
  viewed: { label: 'Viewed', color: '#f59e0b' },
  changes_requested: { label: 'Changes requested', color: '#ec4899' },
  accepted: { label: 'Accepted', color: '#22c55e' },
  declined: { label: 'Declined', color: '#ef4444' },
  expired: { label: 'Expired', color: '#6b7280' },
  booked: { label: 'Booked', color: '#16a34a' },
  cancelled: { label: 'Cancelled', color: '#71717a' },
}

export const ALL_STATUSES = Object.keys(STATUS_META)
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AED', 'EGP', 'SAR']

export function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: '#888' }
  return (
    <span className="status-badge" style={{ '--sc': m.color }}>
      <span className="dot" />
      {m.label}
    </span>
  )
}

export const money = (n, cur = 'USD') =>
  n == null || n === '' || isNaN(Number(n))
    ? '—'
    : `${cur} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export const fromNow = (d) => {
  if (!d) return ''
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
