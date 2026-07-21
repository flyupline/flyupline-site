export const CABINS = ['Economy', 'Premium Economy', 'Business', 'First']

export function toDT(date, time) {
  if (!date) return null
  const d = new Date(`${date}T${time || '00:00'}`)
  return isNaN(d.getTime()) ? null : d
}

export function durationMin(seg) {
  const a = toDT(seg.dep_date, seg.dep_time)
  const b = toDT(seg.arr_date, seg.arr_time)
  if (!a || !b) return null
  const m = Math.round((b - a) / 60000)
  return m > 0 ? m : null
}

export function fmtDuration(min) {
  if (min == null) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function fmtDT(date, time) {
  const d = toDT(date, time)
  if (!d) return ''
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function airportCode(a) {
  return a?.code || ''
}

export function segmentWarnings(seg) {
  const w = []
  const dep = toDT(seg.dep_date, seg.dep_time)
  const arr = toDT(seg.arr_date, seg.arr_time)
  if (seg.from && seg.to && seg.from.code && seg.from.code === seg.to.code) w.push('Departure and arrival airports are the same.')
  if (dep && arr && arr <= dep) w.push('Arrival is before or equal to departure.')
  if (!seg.dep_date) w.push('Departure date is missing.')
  return w
}

// Warnings across consecutive segments in the same journey group.
export function connectionInfo(prev, next) {
  const arr = toDT(prev.arr_date, prev.arr_time)
  const dep = toDT(next.dep_date, next.dep_time)
  if (!arr || !dep) return null
  const min = Math.round((dep - arr) / 60000)
  if (min < 0) return { min, warn: 'Next flight departs before previous arrives.' }
  if (min < 60) return { min, warn: 'Very short connection (under 1h).' }
  return { min }
}
