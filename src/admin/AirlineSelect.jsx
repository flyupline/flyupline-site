import { useEffect, useRef, useState } from 'react'
import { loadAirlines, airlineLogo } from '../lib/datasets.js'

function Logo({ iata, name }) {
  const [ok, setOk] = useState(true)
  if (!iata || !ok) {
    return <span className="airline-initials">{(name || '?').slice(0, 2).toUpperCase()}</span>
  }
  return <img className="airline-logo" src={airlineLogo(iata)} alt="" onError={() => setOk(false)} />
}

// Airline autocomplete. value = { name, iata } | null.
export default function AirlineSelect({ label, value, onChange, required, placeholder = 'Search airline or code', error, id }) {
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    loadAirlines()
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
    const airlines = await loadAirlines()
    const scored = airlines
      .filter((a) => a.name.toLowerCase().includes(s) || a.iata.toLowerCase().includes(s))
      .sort((a, b) => (a.iata.toLowerCase() === s ? -1 : b.iata.toLowerCase() === s ? 1 : 0))
      .slice(0, 8)
    setResults(scored)
    setOpen(scored.length > 0)
  }

  return (
    <div className={`field ac${error ? ' has-error' : ''}`} ref={wrapRef}>
      {label && <label htmlFor={id}>{label}{required && '*'}</label>}
      <div className="airline-input">
        {value && !editing && <Logo iata={value.iata} name={value.name} />}
        <input
          id={id}
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={editing ? query : value ? `${value.name} (${value.iata})` : ''}
          onFocus={() => {
            setEditing(true)
            setQuery('')
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            search(e.target.value)
          }}
        />
      </div>
      {open && editing && (
        <div className="suggest" role="listbox">
          {results.map((a) => (
            <div
              key={a.iata}
              className="suggest-item airline-item"
              role="option"
              aria-selected="false"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange({ name: a.name, iata: a.iata })
                setEditing(false)
                setOpen(false)
              }}
            >
              <Logo iata={a.iata} name={a.name} />
              <div>
                <div className="city">{a.name}</div>
                <div className="code">{a.iata}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
