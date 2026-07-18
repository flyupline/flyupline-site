import { useEffect, useRef, useState } from 'react'
import { IconMapPin } from '../ui/Icons.jsx'

let airportsCache = null
let airportsPromise = null

function loadAirports() {
  if (airportsCache) return Promise.resolve(airportsCache)
  if (!airportsPromise) {
    airportsPromise = fetch('/assets/data/airports.json')
      .then((res) => res.json())
      .then((data) => {
        airportsCache = data
        return data
      })
      .catch((err) => {
        console.error('Airports JSON error:', err)
        return []
      })
  }
  return airportsPromise
}

export default function AirportField({ label, name, placeholder, required = true }) {
  const [value, setValue] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    loadAirports()
  }, [])

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const onInput = async (e) => {
    const next = e.target.value
    setValue(next)
    const query = next.toLowerCase().trim()
    if (!query) {
      setResults([])
      setOpen(false)
      return
    }
    const airports = await loadAirports()
    const matches = airports
      .filter(
        (a) =>
          a.city.toLowerCase().includes(query) ||
          a.name.toLowerCase().includes(query) ||
          a.iata.toLowerCase().includes(query)
      )
      .slice(0, 8)
    setResults(matches)
    setOpen(matches.length > 0)
  }

  return (
    <div className="field field-icon" ref={wrapRef}>
      <label>{label}{required && '*'}</label>
      <IconMapPin />
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
        value={value}
        onChange={onInput}
      />
      {open && (
        <div className="suggest" role="listbox">
          {results.map((a) => (
            <div
              className="suggest-item"
              role="option"
              aria-selected="false"
              key={`${a.iata}-${a.name}`}
              onClick={() => {
                setValue(`${a.city} (${a.iata})`)
                setOpen(false)
              }}
            >
              <div className="city">{a.city}, {a.country}</div>
              <div className="code">{a.name} ({a.iata})</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
