import { useEffect, useMemo, useRef, useState } from 'react'
import { IconCalendar } from '../ui/Icons.jsx'
import Calendar from './Calendar.jsx'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const fmtShort = (isoStr) => {
  const [, m, d] = isoStr.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`
}
const fmtLong = (isoStr) => {
  const [y, m, d] = isoStr.split('-')
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
        <div className="popover popover-cal">
          <Calendar
            mode="range"
            start={start}
            end={end}
            onSelect={({ start: s, end: e }) => {
              setStart(s)
              setEnd(e)
              if (e) setOpen(false)
            }}
          />
          <div className="cal-hint">{start && !end ? 'Now pick your return date' : 'Select your travel dates'}</div>
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
        <div className="popover popover-cal">
          <Calendar
            mode="single"
            start={date}
            onSelect={({ start: s }) => {
              setDate(s)
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
