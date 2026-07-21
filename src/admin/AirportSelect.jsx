import { useEffect, useRef, useState } from 'react'
import { loadAirports } from '../lib/datasets.js'

// Structured airport autocomplete. value = { code, name, city, country } | null.
export default function AirportSelect({ label, value, onChange, required, placeholder = 'Search city, airport or code', error, id }) {
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    loadAirports()
  }, [])

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setEditing(false)
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const search = async (q) => {
    const s = q.toLowerCase().trim()
    if (!s) {
      setResults([])
      setOpen(false)
      return
    }
    const airports = await loadAirports()
    const scored = airports
      .filter((a) => a.code?.toLowerCase().includes(s) || a.city?.toLowerCase().includes(s) || a.name?.toLowerCase().includes(s) || a.country?.toLowerCase().includes(s))
      .sort((a, b) => {
        // exact code match first, then city startsWith
        const ac = a.code?.toLowerCase() === s ? 0 : a.city?.toLowerCase().startsWith(s) ? 1 : 2
        const bc = b.code?.toLowerCase() === s ? 0 : b.city?.toLowerCase().startsWith(s) ? 1 : 2
        return ac - bc
      })
      .slice(0, 8)
    setResults(scored)
    setOpen(scored.length > 0)
  }

  const summary = value ? `${value.code || '—'} · ${value.city || value.name || ''}` : ''

  return (
    <div className={`field field-icon ac${error ? ' has-error' : ''}`} ref={wrapRef}>
      {label && <label htmlFor={id}>{label}{required && '*'}</label>}
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></svg>
      <input
        id={id}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={editing ? query : summary}
        onFocus={() => {
          setEditing(true)
          setQuery('')
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          search(e.target.value)
        }}
      />
      {open && editing && (
        <div className="suggest" role="listbox">
          {results.map((a) => (
            <div
              key={`${a.code}-${a.name}`}
              className="suggest-item"
              role="option"
              aria-selected="false"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(a)
                setEditing(false)
                setOpen(false)
              }}
            >
              <div className="city">{a.name} ({a.code})</div>
              <div className="code">{a.city}, {a.country}</div>
            </div>
          ))}
        </div>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
