import { useState } from 'react'
import AirportField from './AirportField.jsx'
import { IconSwap } from '../ui/Icons.jsx'

// Self-contained From/To pair with a swap button. Emits via the named inputs
// (from[] / to[]) so the existing form submission keeps working.
export default function RouteFields({ required = true }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  return (
    <div className="route-fields">
      <AirportField label="From" name="from[]" placeholder="City or airport" required={required} value={from} onChange={setFrom} />
      <button
        type="button"
        className="swap-btn"
        aria-label="Swap origin and destination"
        onClick={() => {
          setFrom(to)
          setTo(from)
        }}
      >
        <IconSwap />
      </button>
      <AirportField label="To" name="to[]" placeholder="City or airport" required={required} value={to} onChange={setTo} />
    </div>
  )
}
