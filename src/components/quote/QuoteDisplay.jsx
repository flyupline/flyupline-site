// Presentational, branded quote renderer. Shared by the customer quote page
// and the admin preview so both always match. No actions here.

const money = (n, cur = 'USD') =>
  n == null || n === '' || isNaN(Number(n)) ? null : `${cur} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const dt = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')

const PRICE_ROWS = [
  ['base', 'Base price'],
  ['flight', 'Flights'],
  ['hotel', 'Hotels'],
  ['transport', 'Transport & transfers'],
  ['activities', 'Tours & activities'],
  ['insurance', 'Travel insurance'],
  ['service_fee', 'Service fee'],
  ['taxes', 'Taxes'],
  ['additional', 'Additional charges'],
]

function Pricing({ pricing = {}, total, cur, travelers }) {
  const rows = PRICE_ROWS.filter(([k]) => pricing[k] != null && pricing[k] !== '')
  const discount = pricing.discount != null && pricing.discount !== '' ? Number(pricing.discount) : 0
  const deposit = pricing.deposit != null && pricing.deposit !== '' ? Number(pricing.deposit) : null
  const perTraveler = total != null && travelers ? Number(total) / travelers : null
  return (
    <div className="q-pricing">
      <table>
        <tbody>
          {rows.map(([k, label]) => (
            <tr key={k}>
              <td>{label}</td>
              <td>{money(pricing[k], cur)}</td>
            </tr>
          ))}
          {discount > 0 && (
            <tr className="q-discount">
              <td>Discount</td>
              <td>− {money(discount, cur)}</td>
            </tr>
          )}
          <tr className="q-total">
            <td>Total price</td>
            <td>{money(total, cur) || '—'}</td>
          </tr>
          {perTraveler != null && (
            <tr className="q-sub">
              <td>Per traveller</td>
              <td>{money(perTraveler, cur)}</td>
            </tr>
          )}
          {deposit != null && (
            <>
              <tr className="q-sub">
                <td>Deposit to confirm</td>
                <td>{money(deposit, cur)}</td>
              </tr>
              <tr className="q-sub">
                <td>Remaining balance</td>
                <td>{money(Number(total || 0) - deposit, cur)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
      {(pricing.payment_deadline || pricing.refund_terms) && (
        <div className="q-payterms">
          {pricing.payment_deadline && <p><strong>Payment deadline:</strong> {fmt(pricing.payment_deadline)}</p>}
          {pricing.refund_terms && <p><strong>Refund &amp; cancellation:</strong> {pricing.refund_terms}</p>}
        </div>
      )}
    </div>
  )
}

function Flights({ flights = [], cur }) {
  if (!flights.length) return null
  return (
    <div className="q-block">
      <h4>Flights</h4>
      {flights.map((f, i) => (
        <div className="q-flight" key={i}>
          <div className="q-flight-head">
            <strong>{[f.airline, f.flight_number].filter(Boolean).join(' · ') || 'Flight'}</strong>
            {f.cabin && <span className="q-pill">{f.cabin}</span>}
          </div>
          <div className="q-flight-route">
            <span>{f.from || '—'}</span>
            <span className="q-arrow">→</span>
            <span>{f.to || '—'}</span>
          </div>
          <div className="q-flight-meta">
            {f.depart && <span>Depart {dt(f.depart)}</span>}
            {f.arrive && <span>Arrive {dt(f.arrive)}</span>}
            {f.stops != null && f.stops !== '' && <span>{Number(f.stops) === 0 ? 'Direct' : `${f.stops} stop(s)`}</span>}
            {f.baggage && <span>Baggage: {f.baggage}</span>}
          </div>
          {f.return_info && <div className="q-flight-meta"><span>Return: {f.return_info}</span></div>}
          {f.notes && <p className="q-note">{f.notes}</p>}
        </div>
      ))}
    </div>
  )
}

function Hotels({ hotels = [] }) {
  if (!hotels.length) return null
  return (
    <div className="q-block">
      <h4>Hotels</h4>
      {hotels.map((h, i) => (
        <div className="q-hotel" key={i}>
          {h.image && <img src={h.image} alt={h.name || 'Hotel'} className="q-hotel-img" />}
          <div className="q-hotel-body">
            <div className="q-flight-head">
              <strong>{h.name || 'Hotel'}</strong>
              {h.stars && <span className="q-stars">{'★'.repeat(Math.min(5, Number(h.stars) || 0))}</span>}
            </div>
            {h.address && <div className="q-hotel-addr">{h.address}</div>}
            <div className="q-flight-meta">
              {h.checkin && <span>In {fmt(h.checkin)}</span>}
              {h.checkout && <span>Out {fmt(h.checkout)}</span>}
              {h.nights && <span>{h.nights} night(s)</span>}
              {h.room_type && <span>{h.room_type}</span>}
              {h.rooms && <span>{h.rooms} room(s)</span>}
              {h.meal_plan && <span>{h.meal_plan}</span>}
            </div>
            {h.amenities && <p className="q-note">Amenities: {h.amenities}</p>}
            {h.cancellation && <p className="q-note">Cancellation: {h.cancellation}</p>}
            {h.notes && <p className="q-note">{h.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

function Package({ pkg = {} }) {
  const inc = (pkg.inclusions || '').trim()
  const exc = (pkg.exclusions || '').trim()
  const services = ['transfer', 'transportation', 'tours', 'activities', 'insurance', 'visa', 'services']
    .map((k) => pkg[k])
    .filter(Boolean)
  if (!inc && !exc && !services.length) return null
  return (
    <div className="q-block">
      <h4>Package details</h4>
      {services.length > 0 && <p className="q-note">{services.join(' · ')}</p>}
      <div className="q-incexc">
        {inc && (
          <div>
            <h5>Includes</h5>
            <ul>{inc.split('\n').filter(Boolean).map((l, i) => <li key={i} className="inc">{l}</li>)}</ul>
          </div>
        )}
        {exc && (
          <div>
            <h5>Excludes</h5>
            <ul>{exc.split('\n').filter(Boolean).map((l, i) => <li key={i} className="exc">{l}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  )
}

export function OptionCard({ option, cur, selectable, onSelect, selected }) {
  return (
    <div className={`q-option${selected ? ' selected' : ''}`}>
      <div className="q-option-head">
        <div>
          <h3>{option.title || 'Travel option'}</h3>
          {option.description && <p className="muted">{option.description}</p>}
        </div>
        <div className="q-option-price">
          <span className="q-from">from</span>
          <span className="q-amount">{money(option.total_price, cur) || '—'}</span>
        </div>
      </div>
      <Flights flights={option.flights} cur={cur} />
      <Hotels hotels={option.hotels} />
      <Package pkg={option.package} />
      <Pricing pricing={option.pricing} total={option.total_price} cur={cur} travelers={option.travelers} />
      {selectable && (
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 18 }} onClick={() => onSelect(option)}>
          Select this option
        </button>
      )}
    </div>
  )
}

export default function QuoteDisplay({ data, selectable, onSelect, selectedId }) {
  const v = data.version || {}
  const cur = v.currency || 'USD'
  return (
    <div className="q-display">
      <div className="q-summary">
        <div className="q-summary-grid">
          <div><span>Reference</span><strong>{data.reference}</strong></div>
          <div><span>Traveller</span><strong>{data.customerName || '—'}</strong></div>
          <div><span>Route</span><strong>{data.route?.[0] || `${data.origin || '?'} → ${data.destination || '?'}`}</strong></div>
          <div><span>Dates</span><strong>{(data.dates || []).join(' · ') || '—'}</strong></div>
          <div><span>Travellers</span><strong>{(data.travelers || []).join(', ') || '—'}</strong></div>
          {v.expires_at && <div><span>Valid until</span><strong>{fmt(v.expires_at)}</strong></div>}
        </div>
      </div>

      {v.customer_message && (
        <div className="q-message">
          <p>{v.customer_message}</p>
        </div>
      )}

      <div className={`q-options${(data.options || []).length > 1 ? ' multi' : ''}`}>
        {(data.options || []).map((o) => (
          <OptionCard key={o.id || o._k} option={o} cur={cur} selectable={selectable} onSelect={onSelect} selected={selectedId === o.id} />
        ))}
      </div>

      {(v.terms || v.travel_notes || v.required_documents || v.payment_instructions || v.contact_info) && (
        <div className="q-fineprint">
          {v.payment_instructions && <section><h4>Payment instructions</h4><p>{v.payment_instructions}</p></section>}
          {v.required_documents && <section><h4>Required documents</h4><p>{v.required_documents}</p></section>}
          {v.travel_notes && <section><h4>Important travel notes</h4><p>{v.travel_notes}</p></section>}
          {v.terms && <section><h4>Terms &amp; conditions</h4><p>{v.terms}</p></section>}
          {v.contact_info && <section><h4>Contact</h4><p>{v.contact_info}</p></section>}
        </div>
      )}
    </div>
  )
}
