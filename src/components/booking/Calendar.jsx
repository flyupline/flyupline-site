import { useMemo, useState } from 'react'
import { IconArrowLeft, IconArrowRight } from '../ui/Icons.jsx'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
function todayISO() {
  const t = new Date()
  return iso(t.getFullYear(), t.getMonth(), t.getDate())
}

// mode: 'range' | 'single'. Dates are ISO strings (YYYY-MM-DD). onSelect gets { start, end }.
export default function Calendar({ mode = 'range', start = '', end = '', onSelect }) {
  const today = todayISO()
  const seed = start ? new Date(start + 'T00:00:00') : new Date()
  const [view, setView] = useState({ y: seed.getFullYear(), m: seed.getMonth() })
  const [hover, setHover] = useState('')

  const cells = useMemo(() => {
    const firstDay = new Date(view.y, view.m, 1).getDay()
    const days = new Date(view.y, view.m + 1, 0).getDate()
    const out = []
    for (let i = 0; i < firstDay; i++) out.push(null)
    for (let d = 1; d <= days; d++) out.push(iso(view.y, view.m, d))
    return out
  }, [view])

  const move = (delta) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  const curMonthFirst = today.slice(0, 8) + '01'
  const viewFirst = iso(view.y, view.m, 1)
  const canPrev = viewFirst > curMonthFirst

  const pick = (day) => {
    if (!day || day < today) return
    if (mode === 'single') return onSelect({ start: day, end: '' })
    if (!start || (start && end) || day < start) onSelect({ start: day, end: '' })
    else onSelect({ start, end: day })
  }

  const inRange = (day) => {
    if (mode !== 'range' || !start) return false
    const e = end || hover
    if (!e || e === start) return false
    const [lo, hi] = start < e ? [start, e] : [e, start]
    return day > lo && day < hi
  }

  return (
    <div className="cal" onMouseLeave={() => setHover('')}>
      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={() => move(-1)} disabled={!canPrev} aria-label="Previous month">
          <IconArrowLeft />
        </button>
        <span>{MONTHS[view.m]} {view.y}</span>
        <button type="button" className="cal-nav" onClick={() => move(1)} aria-label="Next month">
          <IconArrowRight />
        </button>
      </div>
      <div className="cal-grid cal-weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((day, i) => {
          if (!day) return <span key={`e${i}`} className="cal-cell empty" />
          const disabled = day < today
          const isStart = day === start
          const isEnd = day === end
          const cls = [
            'cal-cell',
            disabled && 'disabled',
            (isStart || isEnd) && 'sel',
            isStart && 'start',
            isEnd && 'end',
            inRange(day) && 'rng',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              type="button"
              key={day}
              className={cls}
              disabled={disabled}
              onClick={() => pick(day)}
              onMouseEnter={() => setHover(day)}
            >
              {Number(day.slice(-2))}
            </button>
          )
        })}
      </div>
    </div>
  )
}
