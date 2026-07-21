// Money is stored and calculated as integer minor units (cents) to avoid
// floating-point errors. Display converts to major units only at the edges.

export function strToCents(str) {
  if (str == null || str === '') return null
  const cleaned = String(str).replace(/[^0-9.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

export function centsToInput(cents) {
  if (cents == null) return ''
  return (cents / 100).toString()
}

export function centsToDisplay(cents) {
  if (cents == null) return ''
  return (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatMoney(cents, currency = 'USD') {
  if (cents == null) return '—'
  return `${currency} ${centsToDisplay(cents)}`
}

// Sanitize keystrokes: digits, a single dot, at most two decimals, optional
// leading minus when allowed. Does NOT group with commas (avoids cursor jump).
export function sanitizeMoneyTyping(str, { allowNegative = false } = {}) {
  let s = String(str).replace(/[^0-9.-]/g, '')
  if (allowNegative) {
    const neg = s.startsWith('-')
    s = s.replace(/-/g, '')
    if (neg) s = '-' + s
  } else {
    s = s.replace(/-/g, '')
  }
  const firstDot = s.indexOf('.')
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
    const [intp, dec] = s.split('.')
    s = intp + '.' + (dec || '').slice(0, 2)
  }
  return s
}
