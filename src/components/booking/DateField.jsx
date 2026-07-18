import { useEffect, useMemo, useRef, useState } from 'react'
import { IconCalendar } from '../ui/Icons.jsx'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fmtShort(iso) {
  const [, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`
}

function fmtLong(iso) {
  const [y, m, d] = iso.split('-')
  return `${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`
}

function useOutsideClose(ref, close) {
  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close()
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [ref, close])
}

export function DateRangeField({ name, label = 'Dates', placeholder = 'Select dates', required = true, defaultToWeek = true }) {
  const defaults = useMemo(() => {
    if (!defaultToWeek) return { start: '', end: '' }
    const today = new Date()
    const week = new Date()
    week.setDate(week.getDate() + 7)
    return { start: toISO(today), end: toISO(week) }
  }, [defaultToWeek])

  const [start, setStart] = useState(defaults.start)
  const [end, setEnd] = useState(defaults.end)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  useOutsideClose(wrapRef, () => setOpen(false))

  const display = start && end ? `${fmtShort(start)} — ${fmtShort(end)}, ${end.split('-')[0]}` : ''

  return (
    <div className="field field-icon" ref={wrapRef}>
      <label>{label}{required && '*'}</label>
      <IconCalendar />
      <input
        type="text"
        name={name}
        readOnly
        placeholder={placeholder}
        required={required}
        value={display}
        onClick={() => setOpen((o) => !o)}
        style={{ cursor: 'pointer' }}
      />
      {open && (
        <div className="popover">
          <div className="popover-row">
            <span>Depart</span>
            <input type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="popover-row">
            <span>Return</span>
            <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
      )}
    </div>
  )
}

export function SingleDateField({ name, label = 'Date', placeholder = 'Select date', required = true }) {
  const [date, setDate] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  useOutsideClose(wrapRef, () => setOpen(false))

  return (
    <div className="field field-icon" ref={wrapRef}>
      <label>{label}{required && '*'}</label>
      <IconCalendar />
      <input
        type="text"
        name={name}
        readOnly
        placeholder={placeholder}
        required={required}
        value={date ? fmtLong(date) : ''}
        onClick={() => setOpen((o) => !o)}
        style={{ cursor: 'pointer' }}
      />
      {open && (
        <div className="popover">
          <div className="popover-row">
            <span>Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setOpen(false)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
