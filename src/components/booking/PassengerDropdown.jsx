import { useEffect, useRef, useState } from 'react'
import { IconUsers, IconChevronDown } from '../ui/Icons.jsx'

const rows = [
  { key: 'adult', title: 'Adults', inputName: 'adult_quantity', min: 1 },
  { key: 'child', title: 'Children', inputName: 'child_quantity', min: 0 },
  { key: 'infant', title: 'Infants', inputName: 'infant_quantity', min: 0 },
]

export default function PassengerDropdown() {
  const [counts, setCounts] = useState({ adult: 1, child: 0, infant: 0 })
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const change = (key, delta, min) =>
    setCounts((c) => ({ ...c, [key]: Math.max(min, c[key] + delta) }))

  const total = counts.adult + counts.child + counts.infant
  const summary = `${total} traveler${total > 1 ? 's' : ''}`

  return (
    <div className="field field-icon" ref={wrapRef}>
      <label>Travelers</label>
      <IconUsers />
      <input
        type="text"
        readOnly
        value={summary}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        style={{ cursor: 'pointer', paddingRight: 38, textOverflow: 'ellipsis' }}
      />
      <IconChevronDown
        style={{ position: 'absolute', right: 14, bottom: 17, width: 15, height: 15, left: 'auto' }}
      />
      {rows.map(({ key, inputName }) => (
        <input key={key} type="hidden" name={inputName} value={counts[key]} />
      ))}
      {open && (
        <div className="popover">
          {rows.map(({ key, title, min }) => (
            <div className="popover-row" key={key}>
              <span>{title}</span>
              <div className="counter">
                <button type="button" aria-label={`Fewer ${title}`} onClick={() => change(key, -1, min)}>−</button>
                <output>{counts[key]}</output>
                <button type="button" aria-label={`More ${title}`} onClick={() => change(key, 1, min)}>+</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
