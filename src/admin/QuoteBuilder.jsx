import { useMemo, useState } from 'react'
import { apiPost } from '../lib/adminApi.js'
import { CURRENCIES, money } from './ui.jsx'

/* ---------- small field helpers ---------- */
const Field = ({ label, children, wide }) => (
  <label className={`qb-field${wide ? ' wide' : ''}`}>
    <span>{label}</span>
    {children}
  </label>
)
const Txt = ({ label, value, onChange, wide, ...rest }) => (
  <Field label={label} wide={wide}>
    <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
  </Field>
)
const Area = ({ label, value, onChange, rows = 3, ...rest }) => (
  <Field label={label} wide>
    <textarea rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
  </Field>
)

const PRICE_FIELDS = [
  ['base', 'Base price'], ['flight', 'Flights'], ['hotel', 'Hotels'], ['transport', 'Transport'],
  ['activities', 'Activities'], ['insurance', 'Insurance'], ['service_fee', 'Service fee'],
  ['taxes', 'Taxes'], ['additional', 'Additional'], ['discount', 'Discount (−)'],
]

const blankOption = () => ({
  _k: Math.random().toString(36).slice(2),
  title: '', description: '', travelers: '',
  flights: [], hotels: [], package: {}, pricing: {}, total_price: '',
})

function OptionEditor({ option, index, cur, onChange, onDuplicate, onRemove, canRemove }) {
  const set = (patch) => onChange({ ...option, ...patch })
  const setPricing = (k, v) => set({ pricing: { ...option.pricing, [k]: v } })
  const setPkg = (k, v) => set({ package: { ...option.package, [k]: v } })

  const calcTotal = useMemo(() => {
    const p = option.pricing || {}
    const add = ['base', 'flight', 'hotel', 'transport', 'activities', 'insurance', 'service_fee', 'taxes', 'additional']
      .reduce((s, k) => s + (Number(p[k]) || 0), 0)
    return add - (Number(p.discount) || 0)
  }, [option.pricing])

  const updSeg = (arr, i, patch) => option[arr].map((s, j) => (j === i ? { ...s, ...patch } : s))

  return (
    <div className="qb-option">
      <div className="qb-option-top">
        <h4>Option {index + 1}</h4>
        <div className="qb-option-actions">
          <button type="button" onClick={onDuplicate}>Duplicate</button>
          {canRemove && <button type="button" className="danger" onClick={onRemove}>Remove</button>}
        </div>
      </div>

      <div className="qb-grid">
        <Txt label="Quote title" value={option.title} onChange={(v) => set({ title: v })} placeholder="e.g. Economy package" wide />
        <Area label="Description" value={option.description} onChange={(v) => set({ description: v })} rows={2} />
        <Txt label="Travellers" type="number" min="0" value={option.travelers} onChange={(v) => set({ travelers: v })} />
      </div>

      {/* Flights */}
      <details className="qb-section" open>
        <summary>Flights ({option.flights.length})</summary>
        {option.flights.map((f, i) => (
          <div className="qb-sub" key={i}>
            <div className="qb-sub-head"><strong>Segment {i + 1}</strong><button type="button" className="danger" onClick={() => set({ flights: option.flights.filter((_, j) => j !== i) })}>Remove</button></div>
            <div className="qb-grid">
              <Txt label="Airline" value={f.airline} onChange={(v) => set({ flights: updSeg('flights', i, { airline: v }) })} />
              <Txt label="Flight number" value={f.flight_number} onChange={(v) => set({ flights: updSeg('flights', i, { flight_number: v }) })} />
              <Txt label="Cabin class" value={f.cabin} onChange={(v) => set({ flights: updSeg('flights', i, { cabin: v }) })} />
              <Txt label="Airline logo URL" value={f.airline_logo} onChange={(v) => set({ flights: updSeg('flights', i, { airline_logo: v }) })} />
              <Txt label="From (airport)" value={f.from} onChange={(v) => set({ flights: updSeg('flights', i, { from: v }) })} />
              <Txt label="To (airport)" value={f.to} onChange={(v) => set({ flights: updSeg('flights', i, { to: v }) })} />
              <Txt label="Departs" type="datetime-local" value={f.depart} onChange={(v) => set({ flights: updSeg('flights', i, { depart: v }) })} />
              <Txt label="Arrives" type="datetime-local" value={f.arrive} onChange={(v) => set({ flights: updSeg('flights', i, { arrive: v }) })} />
              <Txt label="Stops" type="number" min="0" value={f.stops} onChange={(v) => set({ flights: updSeg('flights', i, { stops: v }) })} />
              <Txt label="Layover" value={f.layover} onChange={(v) => set({ flights: updSeg('flights', i, { layover: v }) })} />
              <Txt label="Baggage" value={f.baggage} onChange={(v) => set({ flights: updSeg('flights', i, { baggage: v }) })} />
              <Txt label="Seat" value={f.seat} onChange={(v) => set({ flights: updSeg('flights', i, { seat: v }) })} />
              <Txt label="Return info" value={f.return_info} onChange={(v) => set({ flights: updSeg('flights', i, { return_info: v }) })} wide />
              <Area label="Flight notes" value={f.notes} onChange={(v) => set({ flights: updSeg('flights', i, { notes: v }) })} rows={2} />
            </div>
          </div>
        ))}
        <button type="button" className="qb-add" onClick={() => set({ flights: [...option.flights, {}] })}>+ Add flight segment</button>
      </details>

      {/* Hotels */}
      <details className="qb-section">
        <summary>Hotels ({option.hotels.length})</summary>
        {option.hotels.map((h, i) => (
          <div className="qb-sub" key={i}>
            <div className="qb-sub-head"><strong>Hotel {i + 1}</strong><button type="button" className="danger" onClick={() => set({ hotels: option.hotels.filter((_, j) => j !== i) })}>Remove</button></div>
            <div className="qb-grid">
              <Txt label="Hotel name" value={h.name} onChange={(v) => set({ hotels: updSeg('hotels', i, { name: v }) })} />
              <Txt label="Star rating" type="number" min="1" max="5" value={h.stars} onChange={(v) => set({ hotels: updSeg('hotels', i, { stars: v }) })} />
              <Txt label="Image URL" value={h.image} onChange={(v) => set({ hotels: updSeg('hotels', i, { image: v }) })} wide />
              <Txt label="Address" value={h.address} onChange={(v) => set({ hotels: updSeg('hotels', i, { address: v }) })} wide />
              <Txt label="Check-in" type="date" value={h.checkin} onChange={(v) => set({ hotels: updSeg('hotels', i, { checkin: v }) })} />
              <Txt label="Check-out" type="date" value={h.checkout} onChange={(v) => set({ hotels: updSeg('hotels', i, { checkout: v }) })} />
              <Txt label="Nights" type="number" min="0" value={h.nights} onChange={(v) => set({ hotels: updSeg('hotels', i, { nights: v }) })} />
              <Txt label="Room type" value={h.room_type} onChange={(v) => set({ hotels: updSeg('hotels', i, { room_type: v }) })} />
              <Txt label="Rooms" type="number" min="0" value={h.rooms} onChange={(v) => set({ hotels: updSeg('hotels', i, { rooms: v }) })} />
              <Txt label="Meal plan" value={h.meal_plan} onChange={(v) => set({ hotels: updSeg('hotels', i, { meal_plan: v }) })} />
              <Area label="Amenities" value={h.amenities} onChange={(v) => set({ hotels: updSeg('hotels', i, { amenities: v }) })} rows={2} />
              <Area label="Cancellation policy" value={h.cancellation} onChange={(v) => set({ hotels: updSeg('hotels', i, { cancellation: v }) })} rows={2} />
              <Area label="Hotel notes" value={h.notes} onChange={(v) => set({ hotels: updSeg('hotels', i, { notes: v }) })} rows={2} />
            </div>
          </div>
        ))}
        <button type="button" className="qb-add" onClick={() => set({ hotels: [...option.hotels, {}] })}>+ Add hotel</button>
      </details>

      {/* Package */}
      <details className="qb-section">
        <summary>Package details</summary>
        <div className="qb-grid">
          <Txt label="Airport transfer" value={option.package.transfer} onChange={(v) => setPkg('transfer', v)} />
          <Txt label="Transportation" value={option.package.transportation} onChange={(v) => setPkg('transportation', v)} />
          <Txt label="Tours" value={option.package.tours} onChange={(v) => setPkg('tours', v)} />
          <Txt label="Activities" value={option.package.activities} onChange={(v) => setPkg('activities', v)} />
          <Txt label="Travel insurance" value={option.package.insurance} onChange={(v) => setPkg('insurance', v)} />
          <Txt label="Visa support" value={option.package.visa} onChange={(v) => setPkg('visa', v)} />
          <Txt label="Additional services" value={option.package.services} onChange={(v) => setPkg('services', v)} wide />
          <Area label="Inclusions (one per line)" value={option.package.inclusions} onChange={(v) => setPkg('inclusions', v)} rows={4} />
          <Area label="Exclusions (one per line)" value={option.package.exclusions} onChange={(v) => setPkg('exclusions', v)} rows={4} />
        </div>
      </details>

      {/* Pricing */}
      <details className="qb-section" open>
        <summary>Pricing</summary>
        <div className="qb-grid">
          {PRICE_FIELDS.map(([k, label]) => (
            <Txt key={k} label={label} type="number" min="0" step="0.01" value={option.pricing[k]} onChange={(v) => setPricing(k, v)} />
          ))}
          <Txt label="Deposit" type="number" min="0" step="0.01" value={option.pricing.deposit} onChange={(v) => setPricing('deposit', v)} />
          <Txt label="Payment deadline" type="date" value={option.pricing.payment_deadline} onChange={(v) => setPricing('payment_deadline', v)} />
          <Area label="Refund & cancellation terms" value={option.pricing.refund_terms} onChange={(v) => setPricing('refund_terms', v)} rows={2} />
        </div>
        <div className="qb-total-row">
          <Txt label={`Total price (${cur})`} type="number" min="0" step="0.01" value={option.total_price} onChange={(v) => set({ total_price: v })} />
          <button type="button" className="qb-calc" onClick={() => set({ total_price: String(calcTotal) })}>Use calculated: {money(calcTotal, cur)}</button>
          {option.travelers > 0 && option.total_price && <span className="qb-per">≈ {money(Number(option.total_price) / Number(option.travelers), cur)} / traveller</span>}
        </div>
      </details>
    </div>
  )
}

export default function QuoteBuilder({ request, versions, options, onReload, onPreview }) {
  const draft = versions.find((v) => v.status === 'draft')
  const latest = versions[0]

  const initMeta = draft
    ? { currency: draft.currency || 'USD', customer_message: draft.customer_message || '', terms: draft.terms || '', travel_notes: draft.travel_notes || '', required_documents: draft.required_documents || '', payment_instructions: draft.payment_instructions || '', contact_info: draft.contact_info || '', expires_at: (draft.expires_at || '').slice(0, 10), booking_deadline: (draft.booking_deadline || '').slice(0, 10) }
    : { currency: 'USD', customer_message: '', terms: '', travel_notes: '', required_documents: '', payment_instructions: '', contact_info: '', expires_at: '', booking_deadline: '' }

  const initOptions = draft
    ? options.filter((o) => o.version_id === draft.id).map((o) => ({ _k: o.id, ...o, travelers: o.travelers ?? '', total_price: o.total_price ?? '', flights: o.flights || [], hotels: o.hotels || [], package: o.package || {}, pricing: o.pricing || {} }))
    : [blankOption()]

  const [meta, setMeta] = useState(initMeta)
  const [opts, setOpts] = useState(initOptions.length ? initOptions : [blankOption()])
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)

  const setOpt = (i, next) => setOpts((arr) => arr.map((o, j) => (j === i ? next : o)))
  const flash = (m, ok = true) => { setMsg({ m, ok }); setTimeout(() => setMsg(null), 4000) }

  const payload = () => ({
    requestId: request.id,
    versionId: draft?.id,
    meta: { ...meta, expires_at: meta.expires_at || null, booking_deadline: meta.booking_deadline || null },
    options: opts.map((o) => ({ ...o, travelers: o.travelers === '' ? null : Number(o.travelers), total_price: o.total_price === '' ? null : Number(o.total_price) })),
  })

  const save = async () => {
    setBusy('save')
    try {
      await apiPost('/api/admin/quote', { action: 'save', ...payload() })
      flash('Draft saved.')
      onReload()
    } catch (e) {
      flash(e.message || 'Save failed', false)
    } finally {
      setBusy('')
    }
  }

  const send = async () => {
    if (!confirm('Send this quote to the customer by email? They will receive a secure link to view it.')) return
    setBusy('send')
    try {
      const saved = await apiPost('/api/admin/quote', { action: 'save', ...payload() })
      const r = await apiPost('/api/admin/quote', { action: 'send', requestId: request.id, versionId: saved.versionId })
      flash(r.emailed ? 'Quote sent to customer.' : 'Quote marked sent (email may have failed — check Resend).')
      onReload()
    } catch (e) {
      flash(e.message || 'Send failed', false)
    } finally {
      setBusy('')
    }
  }

  const revise = async () => {
    if (!confirm('Create a new editable version from the latest quote? The sent quote stays intact.')) return
    setBusy('revise')
    try {
      await apiPost('/api/admin/quote', { action: 'revise', requestId: request.id, versionId: latest.id })
      onReload()
    } catch (e) {
      flash(e.message || 'Failed', false)
    } finally {
      setBusy('')
    }
  }

  // If the latest version is not a draft (already sent/etc.), offer to revise.
  const editable = !!draft || versions.length === 0

  return (
    <div className="qb">
      <div className="qb-head">
        <h3>Quote builder</h3>
        {draft ? <span className="qb-badge">Editing draft v{draft.version_number}</span> : versions.length > 0 ? <span className="qb-badge sent">Latest v{latest.version_number} · {latest.status}</span> : <span className="qb-badge">New quote</span>}
      </div>

      {!editable && (
        <div className="qb-locked">
          <p>The latest quote (v{latest.version_number}) is <strong>{latest.status}</strong>. Create a new version to make changes — the original stays intact.</p>
          <button className="btn btn-primary" onClick={revise} disabled={busy === 'revise'}>{busy === 'revise' ? 'Creating…' : 'Revise / new version'}</button>
        </div>
      )}

      {editable && (
        <>
          <div className="qb-meta qb-grid">
            <Field label="Currency">
              <select value={meta.currency} onChange={(e) => setMeta({ ...meta, currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Txt label="Quote expires on" type="date" value={meta.expires_at} onChange={(v) => setMeta({ ...meta, expires_at: v })} />
            <Txt label="Booking deadline" type="date" value={meta.booking_deadline} onChange={(v) => setMeta({ ...meta, booking_deadline: v })} />
            <Area label="Personal message to customer" value={meta.customer_message} onChange={(v) => setMeta({ ...meta, customer_message: v })} rows={3} />
            <Area label="Payment instructions" value={meta.payment_instructions} onChange={(v) => setMeta({ ...meta, payment_instructions: v })} rows={2} />
            <Area label="Required documents" value={meta.required_documents} onChange={(v) => setMeta({ ...meta, required_documents: v })} rows={2} />
            <Area label="Important travel notes" value={meta.travel_notes} onChange={(v) => setMeta({ ...meta, travel_notes: v })} rows={2} />
            <Area label="Terms & conditions" value={meta.terms} onChange={(v) => setMeta({ ...meta, terms: v })} rows={2} />
            <Area label="Contact information" value={meta.contact_info} onChange={(v) => setMeta({ ...meta, contact_info: v })} rows={2} />
          </div>

          {opts.map((o, i) => (
            <OptionEditor
              key={o._k || o.id || i}
              option={o}
              index={i}
              cur={meta.currency}
              onChange={(next) => setOpt(i, next)}
              onDuplicate={() => setOpts((arr) => [...arr, { ...o, _k: Math.random().toString(36).slice(2), id: undefined, title: (o.title || `Option ${i + 1}`) + ' (copy)' }])}
              onRemove={() => setOpts((arr) => arr.filter((_, j) => j !== i))}
              canRemove={opts.length > 1}
            />
          ))}

          <button type="button" className="qb-add-option" onClick={() => setOpts((arr) => [...arr, blankOption()])}>+ Add another option</button>

          {msg && <div className={`admin-alert ${msg.ok ? 'ok' : 'error'}`}>{msg.m}</div>}

          <div className="qb-actions">
            <button className="btn btn-ghost" onClick={save} disabled={!!busy}>{busy === 'save' ? 'Saving…' : 'Save draft'}</button>
            <button className="btn btn-ghost" onClick={() => onPreview({ reference: request.reference, customerName: request.full_name, route: request.payload?.route, dates: request.payload?.dates, travelers: request.payload?.travelers, origin: '', destination: '', version: { ...meta }, options: payload().options })} disabled={!!busy}>Preview</button>
            <button className="btn btn-primary" onClick={send} disabled={!!busy}>{busy === 'send' ? 'Sending…' : 'Send quote'}</button>
          </div>
        </>
      )}
    </div>
  )
}
