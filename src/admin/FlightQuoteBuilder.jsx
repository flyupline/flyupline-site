import { useCallback, useEffect, useRef, useState } from 'react'
import { apiPost } from '../lib/adminApi.js'
import { CURRENCIES, fromNow } from './ui.jsx'
import MoneyInput from './MoneyInput.jsx'
import SegmentEditor from './SegmentEditor.jsx'
import { formatMoney } from '../lib/money.js'
import { fmtDT, fmtDuration, durationMin, connectionInfo, segmentWarnings } from './flightUtils.js'

/* ------------------------------------------------------------------ config */
const TRIP_TYPES = [
  { id: 'one_way', label: 'One-way', groups: [['onward', 'Flights']] },
  { id: 'round_trip', label: 'Round-trip', groups: [['outbound', 'Outbound'], ['return', 'Return']] },
  { id: 'multi_city', label: 'Multi-city', groups: [['onward', 'Journey']] },
]
const groupsFor = (t) => (TRIP_TYPES.find((x) => x.id === t) || TRIP_TYPES[0]).groups

const SERVICE_TYPES = {
  personal_item: { label: 'Personal item', bag: false },
  cabin_baggage: { label: 'Cabin baggage', bag: true },
  checked_baggage: { label: 'Checked baggage', bag: true },
  seat_selection: { label: 'Seat selection', bag: false },
  meal: { label: 'Meal', bag: false },
  priority_boarding: { label: 'Priority boarding', bag: false },
  lounge: { label: 'Lounge access', bag: false },
  changeable: { label: 'Changeable ticket', bag: false },
  refundable: { label: 'Refundable ticket', bag: false },
  other: { label: 'Other', bag: false },
}
const PRESETS = [
  { label: 'Personal item', svc: { type: 'personal_item', included: true } },
  { label: 'Cabin 1×8kg', svc: { type: 'cabin_baggage', pieces: 1, weight: 8, unit: 'kg', weight_type: 'per_piece', included: true } },
  { label: 'Checked 1×23kg', svc: { type: 'checked_baggage', pieces: 1, weight: 23, unit: 'kg', weight_type: 'per_piece', included: true } },
  { label: 'Checked 2×23kg', svc: { type: 'checked_baggage', pieces: 2, weight: 23, unit: 'kg', weight_type: 'per_piece', included: true } },
  { label: 'No checked bag', svc: { type: 'checked_baggage', included: false } },
]

const uid = () => Math.random().toString(36).slice(2)
const blankOption = (travelers = 1) => ({
  _k: uid(), name: '', travelers, trip_type: 'round_trip',
  segments: [], services: [], pricing: { mode: 'total' }, note: '',
})

export function computeTotals(pricing = {}, travelers = 1) {
  const c = (k) => Number(pricing[k + '_cents']) || 0
  const subtotal = c('base') + c('taxes') + c('service_fee') + c('additional') - c('discount')
  const t = Math.max(1, Number(travelers) || 1)
  let total_cents, per_traveler_cents
  if (pricing.mode === 'per_traveler') {
    per_traveler_cents = subtotal
    total_cents = subtotal * t
  } else {
    total_cents = subtotal
    per_traveler_cents = Math.round(subtotal / t)
  }
  return { total_cents, per_traveler_cents, remaining_cents: total_cents - c('deposit') }
}

/* ------------------------------------------------------------------ Section */
function Section({ title, summary, open, onToggle, children }) {
  return (
    <div className={`qb-sec${open ? ' open' : ''}`}>
      <button type="button" className="qb-sec-head" onClick={onToggle}>
        <span className="qb-sec-caret">▸</span>
        <span className="qb-sec-title">{title}</span>
        {summary && <span className="qb-sec-summary">{summary}</span>}
      </button>
      {open && <div className="qb-sec-body">{children}</div>}
    </div>
  )
}

function NoteButton({ value, onChange, label = 'note' }) {
  const [show, setShow] = useState(!!value)
  if (!show) return <button type="button" className="qb-add" onClick={() => setShow(true)}>+ Add {label}</button>
  return (
    <label className="qb-field">
      <span>{label}</span>
      <textarea rows={2} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="qb-remove-note" onClick={() => { onChange(''); setShow(false) }}>Remove {label}</button>
    </label>
  )
}

/* ------------------------------------------------------------------ Segment card */
function SegmentCard({ seg, connection, onEdit, onDuplicate, onDelete }) {
  const dur = seg.duration_min ?? durationMin(seg)
  const warns = segmentWarnings(seg)
  return (
    <>
      {connection && (
        <div className={`seg-connect${connection.warn ? ' warn' : ''}`}>
          {connection.warn ? `⚠ ${connection.warn}` : `Connection: ${fmtDuration(connection.min)}`}
        </div>
      )}
      <div className="seg-card">
        <div className="seg-card-main">
          <div className="seg-route">
            <strong>{seg.from?.code || '???'}</strong>
            <span className="seg-arrow">→</span>
            <strong>{seg.to?.code || '???'}</strong>
          </div>
          <div className="seg-line2">{[seg.airline?.name, seg.flight_number, seg.cabin].filter(Boolean).join(' · ')}</div>
          <div className="seg-line3">{fmtDT(seg.dep_date, seg.dep_time) || 'No date'} → {fmtDT(seg.arr_date, seg.arr_time) || '—'}</div>
          <div className="seg-line4">{dur != null && `Duration: ${fmtDuration(dur)} · `}{seg.direct ? 'Direct' : 'Connecting'}</div>
          {warns.length > 0 && <div className="seg-card-warn">⚠ {warns[0]}</div>}
        </div>
        <div className="seg-card-actions">
          <button type="button" onClick={onEdit}>Edit</button>
          <button type="button" onClick={onDuplicate}>Duplicate</button>
          <button type="button" className="danger" onClick={onDelete}>Delete</button>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ Services */
function ServicesEditor({ services, onChange }) {
  const add = (svc) => onChange([...services, { _k: uid(), unit: 'kg', weight_type: 'per_piece', included: true, ...svc }])
  const upd = (i, patch) => onChange(services.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const del = (i) => onChange(services.filter((_, j) => j !== i))

  return (
    <div className="svc-editor">
      <div className="svc-presets">
        {PRESETS.map((p) => <button type="button" key={p.label} onClick={() => add(p.svc)}>{p.label}</button>)}
        <button type="button" onClick={() => add({ type: 'other' })}>+ Custom</button>
      </div>
      {services.length === 0 && <p className="muted" style={{ fontSize: '0.85rem' }}>No services added. Use a preset above or add a custom one.</p>}
      {services.map((s, i) => {
        const cfg = SERVICE_TYPES[s.type] || SERVICE_TYPES.other
        return (
          <div className="svc-row" key={s._k || i}>
            <select value={s.type} onChange={(e) => upd(i, { type: e.target.value })}>
              {Object.entries(SERVICE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {s.type === 'other' && <input placeholder="Service name" value={s.label || ''} onChange={(e) => upd(i, { label: e.target.value })} />}
            {cfg.bag && (
              <>
                <input className="svc-num" type="number" min="0" placeholder="Pcs" value={s.pieces ?? ''} onChange={(e) => upd(i, { pieces: e.target.value })} />
                <span>×</span>
                <input className="svc-num" type="number" min="0" placeholder="Wt" value={s.weight ?? ''} onChange={(e) => upd(i, { weight: e.target.value })} />
                <select className="svc-unit" value={s.unit || 'kg'} onChange={(e) => upd(i, { unit: e.target.value })}><option>kg</option><option>lb</option></select>
                <select className="svc-unit" value={s.weight_type || 'per_piece'} onChange={(e) => upd(i, { weight_type: e.target.value })}><option value="per_piece">per piece</option><option value="total">total</option></select>
              </>
            )}
            <label className="svc-inc"><input type="checkbox" checked={s.included !== false} onChange={(e) => upd(i, { included: e.target.checked })} /> Included</label>
            <button type="button" className="svc-del" onClick={() => del(i)}>✕</button>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ Pricing */
const PRICE_ROWS = [['base', 'Base fare'], ['taxes', 'Taxes & fees'], ['service_fee', 'Service fee'], ['additional', 'Additional charge'], ['discount', 'Discount']]
function PricingPanel({ pricing, travelers, currency, onChange }) {
  const set = (patch) => onChange({ ...pricing, ...patch })
  const totals = computeTotals(pricing, travelers)
  return (
    <div className="price-panel">
      <div className="price-mode">
        <label><input type="radio" checked={pricing.mode !== 'per_traveler'} onChange={() => set({ mode: 'total' })} /> Total for all travellers</label>
        <label><input type="radio" checked={pricing.mode === 'per_traveler'} onChange={() => set({ mode: 'per_traveler' })} /> Price per traveller</label>
      </div>
      <div className="price-grid">
        {PRICE_ROWS.map(([k, label]) => (
          <label className="qb-field" key={k}>
            <span>{label}</span>
            <MoneyInput cents={pricing[k + '_cents'] ?? null} currency={currency} allowNegative={false} onChange={(c) => set({ [k + '_cents']: c })} />
          </label>
        ))}
        <label className="qb-field">
          <span>Deposit required</span>
          <MoneyInput cents={pricing.deposit_cents ?? null} currency={currency} onChange={(c) => set({ deposit_cents: c })} />
        </label>
        <label className="qb-field">
          <span>Payment deadline</span>
          <input type="date" value={pricing.payment_deadline || ''} onChange={(e) => set({ payment_deadline: e.target.value })} />
        </label>
      </div>
      <div className="price-totals">
        <div><span>Per traveller</span><strong>{formatMoney(totals.per_traveler_cents, currency)}</strong></div>
        <div className="big"><span>Total quote price</span><strong>{formatMoney(totals.total_cents, currency)}</strong></div>
        {pricing.deposit_cents ? <div><span>Remaining balance</span><strong>{formatMoney(totals.remaining_cents, currency)}</strong></div> : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Option card */
function OptionCard({ option, index, currency, errors, onChange, onDuplicate, onRemove, onMove, canRemove, openSeg }) {
  const [openSecs, setOpenSecs] = useState({ itin: true, svc: false, price: false })
  const toggle = (k) => setOpenSecs((s) => ({ ...s, [k]: !s[k] }))
  const set = (patch) => onChange({ ...option, ...patch })
  const totals = computeTotals(option.pricing, option.travelers)
  const groups = groupsFor(option.trip_type)
  const segCount = option.segments.length
  const incBags = option.services.filter((s) => s.included !== false && (s.type === 'checked_baggage')).reduce((n, s) => n + (Number(s.pieces) || 1), 0)

  return (
    <div className="qb-option2">
      <div className="qb-option2-head">
        <input className="qb-option-name" placeholder={`Option ${index + 1} name (e.g. Lowest Price)`} value={option.name} onChange={(e) => set({ name: e.target.value })} />
        <div className="qb-option2-actions">
          <button type="button" onClick={() => onMove(-1)} title="Move up">↑</button>
          <button type="button" onClick={() => onMove(1)} title="Move down">↓</button>
          <button type="button" onClick={onDuplicate}>Duplicate</button>
          {canRemove && <button type="button" className="danger" onClick={onRemove}>Delete</button>}
        </div>
      </div>

      <div className="qb-option2-meta">
        <label className="qb-field inline"><span>Travellers</span><input type="number" min="1" value={option.travelers} onChange={(e) => set({ travelers: Number(e.target.value) || 1 })} /></label>
        <label className="qb-field inline"><span>Trip type</span>
          <select value={option.trip_type} onChange={(e) => set({ trip_type: e.target.value })}>{TRIP_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        </label>
      </div>

      <Section title="Flight itinerary" open={openSecs.itin} onToggle={() => toggle('itin')} summary={`${segCount} segment${segCount === 1 ? '' : 's'}`}>
        {errors?.segments && <div className="field-error block">{errors.segments}</div>}
        {groups.map(([g, glabel]) => {
          const segs = option.segments.map((s, i) => ({ s, i })).filter(({ s }) => (s.group || 'onward') === g)
          return (
            <div className="seg-group" key={g}>
              {groups.length > 1 && <div className="seg-group-title">{glabel}</div>}
              {segs.map(({ s, i }, gi) => {
                const prev = gi > 0 ? segs[gi - 1].s : null
                return (
                  <SegmentCard
                    key={s._k || i}
                    seg={s}
                    connection={prev ? connectionInfo(prev, s) : null}
                    onEdit={() => openSeg(option._k, i, glabel)}
                    onDuplicate={() => set({ segments: [...option.segments.slice(0, i + 1), { ...s, _k: uid() }, ...option.segments.slice(i + 1)] })}
                    onDelete={() => set({ segments: option.segments.filter((_, j) => j !== i) })}
                  />
                )
              })}
              <button type="button" className="qb-add" onClick={() => openSeg(option._k, -1, glabel, g)}>+ Add flight{groups.length > 1 ? ` (${glabel})` : ' segment'}</button>
            </div>
          )
        })}
      </Section>

      <Section title="Baggage & included services" open={openSecs.svc} onToggle={() => toggle('svc')} summary={option.services.length ? `${option.services.length} service${option.services.length === 1 ? '' : 's'}${incBags ? ` · ${incBags} checked bag` : ''}` : 'None'}>
        <ServicesEditor services={option.services} onChange={(services) => set({ services })} />
      </Section>

      <Section title="Pricing" open={openSecs.price} onToggle={() => toggle('price')} summary={totals.total_cents ? `Total: ${formatMoney(totals.total_cents, currency)}` : 'Not set'}>
        {errors?.price && <div className="field-error block">{errors.price}</div>}
        <PricingPanel pricing={option.pricing} travelers={option.travelers} currency={currency} onChange={(pricing) => set({ pricing })} />
        <NoteButton value={option.note} onChange={(note) => set({ note })} label="option note" />
      </Section>
    </div>
  )
}

/* ------------------------------------------------------------------ main */
export default function FlightQuoteBuilder({ request, versions, options, onRefresh, onReloadHard, onPreview }) {
  const draft = versions.find((v) => v.status === 'draft')
  const latest = versions[0]

  // Initialise once from the draft that existed at mount.
  const initMeta = () =>
    draft
      ? { currency: draft.currency || 'USD', expires_at: (draft.expires_at || '').slice(0, 10), booking_deadline: (draft.booking_deadline || '').slice(0, 10), note: draft.customer_message || '', terms: draft.terms || '' }
      : { currency: 'USD', expires_at: '', booking_deadline: '', note: '', terms: '' }
  const initOptions = () => {
    if (draft) {
      const rows = options.filter((o) => o.version_id === draft.id)
      if (rows.length) {
        return rows.map((o) => ({
          _k: o.id, id: o.id, name: o.title || '', travelers: o.travelers || 1, trip_type: o.pricing?.trip_type || 'round_trip',
          segments: (o.flights || []).map((s) => ({ _k: uid(), ...s })),
          services: ((o.package && o.package.services) || []).map((s) => ({ _k: uid(), ...s })),
          pricing: o.pricing || { mode: 'total' }, note: o.description || '',
        }))
      }
    }
    return [blankOption(defaultTravelers())]
  }
  function defaultTravelers() {
    const t = (request.payload?.travelers || []).join(' ')
    const m = t.match(/(\d+)\s*adult/i)
    return m ? Number(m[1]) : 1
  }

  const [meta, setMeta] = useState(initMeta)
  const [options2, setOptions2] = useState(initOptions)
  const [segEdit, setSegEdit] = useState(null) // { optionKey, index, groupLabel, group }
  const [showNote, setShowNote] = useState(!!initMeta().note)
  const [showTerms, setShowTerms] = useState(!!initMeta().terms)
  const [saveState, setSaveState] = useState(draft ? { status: 'saved', at: draft.updated_at } : { status: 'idle' })
  const [busy, setBusy] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [triedSend, setTriedSend] = useState(false)

  const versionIdRef = useRef(draft?.id || null)
  const touchedRef = useRef(false)
  const savingRef = useRef(false)
  const pendingRef = useRef(false)

  const editable = !!draft || versions.length === 0

  /* ---- payload builders ---- */
  const optionsPayload = useCallback(
    () =>
      options2.map((o) => {
        const totals = computeTotals(o.pricing, o.travelers)
        return {
          title: o.name || null,
          description: o.note || null,
          travelers: o.travelers || 1,
          flights: o.segments.map(({ _k, ...s }) => s),
          hotels: [],
          package: { services: o.services.map(({ _k, ...s }) => s) },
          pricing: { ...o.pricing, trip_type: o.trip_type, ...totals },
          total_price: totals.total_cents != null ? totals.total_cents / 100 : null,
        }
      }),
    [options2]
  )
  const metaPayload = useCallback(
    () => ({ currency: meta.currency, customer_message: meta.note || null, terms: meta.terms || null, expires_at: meta.expires_at || null, booking_deadline: meta.booking_deadline || null }),
    [meta]
  )

  /* ---- autosave ---- */
  const doSave = useCallback(
    async ({ silent = true } = {}) => {
      if (savingRef.current) {
        pendingRef.current = true
        return
      }
      savingRef.current = true
      setSaveState({ status: 'saving' })
      try {
        const res = await apiPost('/api/admin/quote', { action: 'save', requestId: request.id, versionId: versionIdRef.current, meta: metaPayload(), options: optionsPayload(), silent })
        versionIdRef.current = res.versionId
        setSaveState({ status: 'saved', at: new Date().toISOString() })
      } catch (e) {
        setSaveState({ status: 'error', msg: e.message })
      } finally {
        savingRef.current = false
        if (pendingRef.current) {
          pendingRef.current = false
          doSave({ silent })
        }
      }
    },
    [request.id, metaPayload, optionsPayload]
  )

  useEffect(() => {
    if (!editable || !touchedRef.current) return
    const t = setTimeout(() => doSave({ silent: true }), 1600)
    return () => clearTimeout(t)
  }, [meta, options2, editable, doSave])

  const mark = () => { touchedRef.current = true }
  const patchMeta = (patch) => { mark(); setMeta((m) => ({ ...m, ...patch })) }
  const setOption = (i, next) => { mark(); setOptions2((arr) => arr.map((o, j) => (j === i ? next : o))) }
  const moveOption = (i, dir) => setOptions2((arr) => {
    const j = i + dir
    if (j < 0 || j >= arr.length) return arr
    const copy = [...arr]
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
    mark()
    return copy
  })

  /* ---- validation ---- */
  const optionErrors = (o) => {
    const e = {}
    if (o.segments.length === 0) e.segments = 'Add at least one flight segment.'
    else {
      const bad = o.segments.some((s) => !s.from || !s.to || !s.dep_date || !s.airline || !s.flight_number)
      if (bad) e.segments = 'Every segment needs from, to, date, airline and flight number.'
    }
    const totals = computeTotals(o.pricing, o.travelers)
    if (!totals.total_cents || totals.total_cents <= 0) e.price = 'Enter a total price greater than zero.'
    return e
  }
  const errorsByOption = options2.map(optionErrors)
  const missing = []
  if (!meta.expires_at) missing.push('Quote expiration date')
  if (options2.length === 0) missing.push('At least one option')
  errorsByOption.forEach((e, i) => Object.values(e).forEach((m) => missing.push(`Option ${i + 1}: ${m}`)))
  const canSend = missing.length === 0

  /* ---- segment save ---- */
  const saveSegment = (seg) => {
    const { optionKey, index, group } = segEdit
    mark()
    setOptions2((arr) =>
      arr.map((o) => {
        if (o._k !== optionKey) return o
        const withGroup = { ...seg, group: seg.group || group || 'onward', _k: index >= 0 ? o.segments[index]._k : uid() }
        const segments = index >= 0 ? o.segments.map((s, j) => (j === index ? withGroup : s)) : [...o.segments, withGroup]
        return { ...o, segments }
      })
    )
    setSegEdit(null)
  }

  /* ---- actions ---- */
  const manualSave = async () => { setBusy('save'); await doSave({ silent: false }); onRefresh?.(); setBusy('') }
  const preview = () => onPreview(previewData())
  const previewData = () => ({
    reference: request.reference, customerName: request.full_name,
    route: request.payload?.route, dates: request.payload?.dates, travelers: request.payload?.travelers,
    version: { currency: meta.currency, customer_message: meta.note, terms: meta.terms, expires_at: meta.expires_at, booking_deadline: meta.booking_deadline },
    options: optionsPayload().map((o) => ({ ...o, id: uid() })),
  })
  const doSend = async () => {
    setBusy('send')
    try {
      await doSave({ silent: false })
      const r = await apiPost('/api/admin/quote', { action: 'send', requestId: request.id, versionId: versionIdRef.current })
      setConfirm(false)
      onReloadHard?.()
      if (!r.emailed) alert('Quote saved & marked sent, but the email may have failed. Check the customer email address / Resend.')
    } catch (e) {
      alert(e.message || 'Send failed')
      setBusy('')
    }
  }
  const revise = async () => {
    setBusy('revise')
    try {
      await apiPost('/api/admin/quote', { action: 'revise', requestId: request.id, versionId: latest.id })
      onReloadHard?.()
    } catch (e) {
      alert(e.message || 'Failed')
      setBusy('')
    }
  }

  /* ---- summary ---- */
  const firstSeg = options2[0]?.segments[0]
  const routeStr = firstSeg?.from?.code ? `${firstSeg.from.code} → ${firstSeg.to?.code || '?'}` : (request.payload?.route?.[0] || '—')
  const optionTotalsCents = options2.map((o) => computeTotals(o.pricing, o.travelers).total_cents).filter((c) => c && c > 0)
  const quoteTotalCents = optionTotalsCents.length ? Math.min(...optionTotalsCents) : null
  const totalDisplay = quoteTotalCents != null ? formatMoney(quoteTotalCents, meta.currency) : '—'

  if (!editable) {
    return (
      <div className="qb">
        <div className="qb-head"><h3>Quote builder</h3><span className="qb-badge sent">Latest v{latest.version_number} · {latest.status}</span></div>
        <div className="qb-locked">
          <p>The latest quote (v{latest.version_number}) is <strong>{latest.status}</strong>. Create a new version to make changes — the sent quote stays intact.</p>
          <button className="btn btn-primary" onClick={revise} disabled={busy === 'revise'}>{busy === 'revise' ? 'Creating…' : 'Revise / new version'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="qb2">
      <div className="qb2-main">
        <div className="qb-head">
          <h3>Flight quote builder</h3>
          <span className={`save-pill ${saveState.status}`}>
            {saveState.status === 'saving' ? 'Saving…' : saveState.status === 'saved' ? `Saved ${fromNow(saveState.at)}` : saveState.status === 'error' ? 'Save failed' : 'Not saved'}
          </span>
        </div>

        {/* General */}
        <div className="qb-general">
          <div className="qb-grid">
            <label className="qb-field"><span>Currency*</span>
              <select value={meta.currency} onChange={(e) => patchMeta({ currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className={`qb-field${triedSend && !meta.expires_at ? ' has-error' : ''}`}><span>Quote expires*</span>
              <input type="date" value={meta.expires_at} onChange={(e) => patchMeta({ expires_at: e.target.value })} />
              {triedSend && !meta.expires_at && <span className="field-error">Required</span>}
            </label>
            <label className="qb-field"><span>Booking deadline</span>
              <input type="date" value={meta.booking_deadline} onChange={(e) => patchMeta({ booking_deadline: e.target.value })} />
            </label>
          </div>
          <div className="qb-optional-btns">
            {!showNote ? <button type="button" className="qb-add" onClick={() => setShowNote(true)}>+ Add note</button>
              : <label className="qb-field wide"><span>General note</span><textarea rows={2} value={meta.note} onChange={(e) => patchMeta({ note: e.target.value })} /><button type="button" className="qb-remove-note" onClick={() => { patchMeta({ note: '' }); setShowNote(false) }}>Remove note</button></label>}
            {!showTerms ? <button type="button" className="qb-add" onClick={() => setShowTerms(true)}>+ Add terms</button>
              : <label className="qb-field wide"><span>Terms &amp; conditions</span><textarea rows={2} value={meta.terms} onChange={(e) => patchMeta({ terms: e.target.value })} /><button type="button" className="qb-remove-note" onClick={() => { patchMeta({ terms: '' }); setShowTerms(false) }}>Remove terms</button></label>}
          </div>
        </div>

        {options2.map((o, i) => (
          <OptionCard
            key={o._k} option={o} index={i} currency={meta.currency} errors={triedSend ? errorsByOption[i] : null}
            onChange={(next) => setOption(i, next)}
            onDuplicate={() => { mark(); setOptions2((arr) => [...arr, { ...o, _k: uid(), id: undefined, name: (o.name || `Option ${i + 1}`) + ' (copy)', segments: o.segments.map((s) => ({ ...s, _k: uid() })), services: o.services.map((s) => ({ ...s, _k: uid() })) }]) }}
            onRemove={() => { mark(); setOptions2((arr) => arr.filter((_, j) => j !== i)) }}
            onMove={(dir) => moveOption(i, dir)}
            canRemove={options2.length > 1}
            openSeg={(optionKey, index, groupLabel, group) => setSegEdit({ optionKey, index, groupLabel, group })}
          />
        ))}

        <button type="button" className="qb-add-option" onClick={() => { mark(); setOptions2((arr) => [...arr, blankOption(defaultTravelers())]) }}>+ Add another option</button>
      </div>

      {/* Sticky summary */}
      <aside className="qb-summary">
        <h4>Quote summary</h4>
        <dl>
          <dt>Customer</dt><dd>{request.full_name || '—'}</dd>
          <dt>Route</dt><dd>{routeStr}</dd>
          <dt>Dates</dt><dd>{(request.payload?.dates || []).join(' · ') || '—'}</dd>
          <dt>Travellers</dt><dd>{(request.payload?.travelers || []).join(', ') || '—'}</dd>
          <dt>Options</dt><dd>{options2.length}</dd>
          <dt>Currency</dt><dd>{meta.currency}</dd>
          <dt>From total</dt><dd className="summary-total">{totalDisplay}</dd>
          <dt>Expires</dt><dd>{meta.expires_at || <span className="muted">not set</span>}</dd>
        </dl>
        {missing.length > 0 && (
          <div className="summary-missing">
            <strong>Before sending:</strong>
            <ul>{missing.slice(0, 6).map((m, i) => <li key={i}>{m}</li>)}</ul>
          </div>
        )}
      </aside>

      {/* Sticky action bar */}
      <div className="qb-actionbar">
        <span className={`save-pill ${saveState.status}`}>{saveState.status === 'saving' ? 'Saving…' : saveState.status === 'saved' ? `Saved ${fromNow(saveState.at)}` : ''}</span>
        <div className="qb-actionbar-btns">
          <button className="btn btn-ghost" onClick={manualSave} disabled={!!busy}>{busy === 'save' ? 'Saving…' : 'Save draft'}</button>
          <button className="btn btn-ghost" onClick={preview}>Preview</button>
          <button className="btn btn-primary" onClick={() => { setTriedSend(true); if (canSend) setConfirm(true) }} disabled={!!busy}>Send quote</button>
        </div>
      </div>

      {segEdit && (
        <SegmentEditor
          initial={segEdit.index >= 0 ? options2.find((o) => o._k === segEdit.optionKey).segments[segEdit.index] : null}
          groupLabel={segEdit.groupLabel}
          onSave={saveSegment}
          onClose={() => setSegEdit(null)}
        />
      )}

      {confirm && (
        <div className="preview-overlay" onMouseDown={() => !busy && setConfirm(false)}>
          <div className="q-modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Send quote to customer?</h3>
            <dl className="kv">
              <dt>To</dt><dd>{request.email}</dd>
              <dt>Options</dt><dd>{options2.length}</dd>
              <dt>From total</dt><dd>{totalDisplay}</dd>
              <dt>Expires</dt><dd>{meta.expires_at}</dd>
              {meta.booking_deadline && <><dt>Book by</dt><dd>{meta.booking_deadline}</dd></>}
            </dl>
            <div className="qb-actions">
              <button className="btn btn-ghost" onClick={() => setConfirm(false)} disabled={!!busy}>Cancel</button>
              <button className="btn btn-primary" onClick={doSend} disabled={!!busy}>{busy === 'send' ? 'Sending…' : 'Send quote'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
