// Presentational, branded flight-quote renderer. Shared by the customer quote
// page and the admin preview so both always match. No actions here.
import { formatMoney } from '../../lib/money.js'
import { fmtDT, fmtDuration, durationMin, connectionInfo } from '../../admin/flightUtils.js'

const fmtD = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

const SERVICE_LABELS = {
  personal_item: 'Personal item', cabin_baggage: 'Cabin baggage', checked_baggage: 'Checked baggage',
  seat_selection: 'Seat selection', meal: 'Meal', priority_boarding: 'Priority boarding',
  lounge: 'Lounge access', changeable: 'Changeable ticket', refundable: 'Refundable ticket', other: 'Service',
}
function serviceText(s) {
  const base = s.type === 'other' ? s.label || 'Service' : SERVICE_LABELS[s.type] || 'Service'
  if ((s.type === 'checked_baggage' || s.type === 'cabin_baggage') && (s.pieces || s.weight)) {
    const w = s.weight ? `${s.weight}${s.unit || 'kg'}` : ''
    return `${s.pieces || 1} × ${w} ${base}`.replace('  ', ' ').trim()
  }
  return base
}

const GROUP_LABEL = { outbound: 'Outbound', return: 'Return', onward: 'Flights' }

function SegmentRow({ seg, connection }) {
  const dur = seg.duration_min ?? durationMin(seg)
  return (
    <>
      {connection && (
        <div className={`qd-connect${connection.warn ? ' warn' : ''}`}>
          {connection.warn ? connection.warn : `Connection · ${fmtDuration(connection.min)}`}
        </div>
      )}
      <div className="qd-seg">
        <div className="qd-seg-route">
          <div className="qd-ap"><strong>{seg.from?.code || '—'}</strong><span>{seg.from?.city || ''}</span></div>
          <div className="qd-seg-mid">
            <span className="qd-airline">{[seg.airline?.name, seg.flight_number].filter(Boolean).join(' · ')}</span>
            <span className="qd-plane">✈</span>
            {dur != null && <span className="qd-dur">{fmtDuration(dur)}</span>}
          </div>
          <div className="qd-ap"><strong>{seg.to?.code || '—'}</strong><span>{seg.to?.city || ''}</span></div>
        </div>
        <div className="qd-seg-times">
          <span>{fmtDT(seg.dep_date, seg.dep_time) || '—'}</span>
          <span>{seg.cabin}{seg.direct === false ? ' · Connecting' : ''}</span>
          <span>{fmtDT(seg.arr_date, seg.arr_time) || '—'}</span>
        </div>
        {seg.note && <p className="qd-note">{seg.note}</p>}
      </div>
    </>
  )
}

export function OptionCard({ option, cur, selectable, onSelect, selected }) {
  const pricing = option.pricing || {}
  const segs = option.flights || []
  const services = (option.package && option.package.services) || []
  const groups = ['outbound', 'return', 'onward'].filter((g) => segs.some((s) => (s.group || 'onward') === g))

  const priceRows = [
    ['base_cents', 'Base fare'], ['taxes_cents', 'Taxes & fees'], ['service_fee_cents', 'Service fee'], ['additional_cents', 'Additional'],
  ].filter(([k]) => pricing[k] != null)
  const discount = pricing.discount_cents || 0
  const deposit = pricing.deposit_cents
  const total = pricing.total_cents != null ? pricing.total_cents : (option.total_price != null ? Math.round(option.total_price * 100) : null)
  const perTraveler = pricing.per_traveler_cents

  return (
    <div className={`q-option${selected ? ' selected' : ''}`}>
      <div className="q-option-head">
        <div>
          <h3>{option.title || 'Flight option'}</h3>
          {option.travelers ? <p className="muted">{option.travelers} traveller{option.travelers > 1 ? 's' : ''}</p> : null}
        </div>
        <div className="q-option-price">
          <span className="q-from">total</span>
          <span className="q-amount">{formatMoney(total, cur)}</span>
          {perTraveler != null && <span className="q-per">{formatMoney(perTraveler, cur)} / traveller</span>}
        </div>
      </div>

      {segs.length > 0 && (
        <div className="q-block">
          {groups.map((g) => {
            const list = segs.filter((s) => (s.group || 'onward') === g)
            return (
              <div key={g} className="qd-group">
                {groups.length > 1 && <div className="qd-group-title">{GROUP_LABEL[g]}</div>}
                {list.map((s, i) => <SegmentRow key={i} seg={s} connection={i > 0 ? connectionInfo(list[i - 1], s) : null} />)}
              </div>
            )
          })}
        </div>
      )}

      {services.length > 0 && (
        <div className="q-block">
          <h4>Baggage &amp; services</h4>
          <ul className="qd-services">
            {services.map((s, i) => (
              <li key={i} className={s.included === false ? 'exc' : 'inc'}>{serviceText(s)}{s.included === false ? ' (not included)' : ''}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="q-pricing">
        <table>
          <tbody>
            {priceRows.map(([k, label]) => <tr key={k}><td>{label}</td><td>{formatMoney(pricing[k], cur)}</td></tr>)}
            {discount > 0 && <tr className="q-discount"><td>Discount</td><td>− {formatMoney(discount, cur)}</td></tr>}
            <tr className="q-total"><td>Total</td><td>{formatMoney(total, cur)}</td></tr>
            {perTraveler != null && <tr className="q-sub"><td>Per traveller</td><td>{formatMoney(perTraveler, cur)}</td></tr>}
            {deposit != null && <tr className="q-sub"><td>Deposit to confirm</td><td>{formatMoney(deposit, cur)}</td></tr>}
            {deposit != null && total != null && <tr className="q-sub"><td>Remaining balance</td><td>{formatMoney(total - deposit, cur)}</td></tr>}
          </tbody>
        </table>
        {pricing.payment_deadline && <p className="q-payterms"><strong>Payment deadline:</strong> {fmtD(pricing.payment_deadline)}</p>}
      </div>

      {option.description && <p className="qd-optnote">{option.description}</p>}

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
          {v.expires_at && <div><span>Valid until</span><strong>{fmtD(v.expires_at)}</strong></div>}
        </div>
      </div>

      {v.customer_message && <div className="q-message"><p>{v.customer_message}</p></div>}

      <div className={`q-options${(data.options || []).length > 1 ? ' multi' : ''}`}>
        {(data.options || []).map((o) => (
          <OptionCard key={o.id || o._k} option={o} cur={cur} selectable={selectable} onSelect={onSelect} selected={selectedId === o.id} />
        ))}
      </div>

      {(v.terms || v.booking_deadline) && (
        <div className="q-fineprint">
          {v.booking_deadline && <section><h4>Booking deadline</h4><p>{fmtD(v.booking_deadline)}</p></section>}
          {v.terms && <section><h4>Terms &amp; conditions</h4><p>{v.terms}</p></section>}
        </div>
      )}
    </div>
  )
}
