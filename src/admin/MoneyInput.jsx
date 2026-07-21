import { useState } from 'react'
import { centsToInput, centsToDisplay, strToCents, sanitizeMoneyTyping } from '../lib/money.js'

// Controlled money input. Parent owns `cents` (integer|null) and receives
// updates via onChange(cents). While focused it shows the plain value for
// smooth editing; on blur it formats with thousands separators.
export default function MoneyInput({ cents, onChange, currency = 'USD', allowNegative = false, placeholder = '0.00', id }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')

  const display = focused ? raw : cents == null ? '' : centsToDisplay(cents)

  return (
    <div className="money-input">
      <span className="money-cur">{currency}</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={display}
        onFocus={() => {
          setRaw(centsToInput(cents))
          setFocused(true)
        }}
        onChange={(e) => {
          const next = sanitizeMoneyTyping(e.target.value, { allowNegative })
          setRaw(next)
          onChange(strToCents(next))
        }}
        onBlur={() => setFocused(false)}
      />
    </div>
  )
}
