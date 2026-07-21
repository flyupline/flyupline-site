import { useState } from 'react'
import AirportSelect from './AirportSelect.jsx'
import AirlineSelect from './AirlineSelect.jsx'
import { CABINS, durationMin, fmtDuration, segmentWarnings } from './flightUtils.js'

const F = ({ label, children }) => (
  <label className="qb-field">
    <span>{label}</span>
    {children}
  </label>
)

export default function SegmentEditor({ initial, groupLabel, onSave, onClose }) {
  const [seg, setSeg] = useState(
    initial || { from: null, to: null, dep_date: '', dep_time: '', arr_date: '', arr_time: '', airline: null, flight_number: '', cabin: 'Economy', fare_class: '', direct: true, aircraft: '', operating: '', booking_ref: '', note: '' }
  )
  const [showMore, setShowMore] = useState(!!(seg.aircraft || seg.operating || seg.booking_ref))
  const [showNote, setShowNote] = useState(!!seg.note)
  const set = (patch) => setSeg((s) => ({ ...s, ...patch }))
  const warnings = segmentWarnings(seg)
  const dur = durationMin(seg)

  const errors = {}
  if (!seg.from) errors.from = 'Required'
  if (!seg.to) errors.to = 'Required'
  if (!seg.dep_date) errors.dep = 'Required'
  if (!seg.airline) errors.airline = 'Required'
  if (!seg.flight_number?.trim()) errors.fn = 'Required'
  const canSave = Object.keys(errors).length === 0

  return (
    <div className="preview-overlay" onMouseDown={onClose}>
      <div className="seg-drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="preview-bar">
          <strong>{initial ? 'Edit flight segment' : 'Add flight segment'}{groupLabel ? ` · ${groupLabel}` : ''}</strong>
          <button onClick={onClose}>Close ✕</button>
        </div>
        <div className="seg-body">
          <h5 className="seg-h">Route</h5>
          <div className="qb-grid">
            <AirportSelect label="From" value={seg.from} onChange={(v) => set({ from: v })} required error={errors.from} />
            <AirportSelect label="To" value={seg.to} onChange={(v) => set({ to: v })} required error={errors.to} />
          </div>

          <h5 className="seg-h">Schedule</h5>
          <div className="qb-grid">
            <F label="Departure date"><input type="date" value={seg.dep_date} onChange={(e) => set({ dep_date: e.target.value })} /></F>
            <F label="Departure time"><input type="time" value={seg.dep_time} onChange={(e) => set({ dep_time: e.target.value })} /></F>
            <F label="Arrival date"><input type="date" value={seg.arr_date} onChange={(e) => set({ arr_date: e.target.value })} /></F>
            <F label="Arrival time"><input type="time" value={seg.arr_time} onChange={(e) => set({ arr_time: e.target.value })} /></F>
          </div>
          {dur != null && <p className="seg-dur">Duration: <strong>{fmtDuration(dur)}</strong></p>}

          <h5 className="seg-h">Airline</h5>
          <div className="qb-grid">
            <AirlineSelect label="Airline" value={seg.airline} onChange={(v) => set({ airline: v })} required error={errors.airline} />
            <F label="Flight number"><input value={seg.flight_number} onChange={(e) => set({ flight_number: e.target.value })} placeholder="e.g. MS996" style={errors.fn ? { borderColor: '#ef4444' } : undefined} /></F>
            <F label="Cabin class">
              <select value={seg.cabin} onChange={(e) => set({ cabin: e.target.value })}>{CABINS.map((c) => <option key={c}>{c}</option>)}</select>
            </F>
            <F label="Fare class (optional)"><input value={seg.fare_class} onChange={(e) => set({ fare_class: e.target.value })} placeholder="e.g. Y" /></F>
          </div>

          <label className="seg-toggle"><input type="checkbox" checked={!seg.direct} onChange={(e) => set({ direct: !e.target.checked })} /> This is a connecting flight (part of a multi-leg journey)</label>

          {!showMore ? (
            <button type="button" className="qb-add" onClick={() => setShowMore(true)}>+ Add aircraft / operating / booking ref</button>
          ) : (
            <div className="qb-grid">
              <F label="Aircraft (optional)"><input value={seg.aircraft} onChange={(e) => set({ aircraft: e.target.value })} placeholder="e.g. Boeing 737" /></F>
              <F label="Operating airline (optional)"><input value={seg.operating} onChange={(e) => set({ operating: e.target.value })} /></F>
              <F label="Booking reference (optional)"><input value={seg.booking_ref} onChange={(e) => set({ booking_ref: e.target.value })} /></F>
            </div>
          )}

          {!showNote ? (
            <button type="button" className="qb-add" onClick={() => setShowNote(true)}>+ Add note</button>
          ) : (
            <F label="Segment note">
              <textarea rows={2} value={seg.note} onChange={(e) => set({ note: e.target.value })} />
            </F>
          )}

          {warnings.length > 0 && (
            <div className="seg-warn">{warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}</div>
          )}
        </div>
        <div className="seg-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!canSave} onClick={() => onSave({ ...seg, duration_min: dur })}>Save segment</button>
        </div>
      </div>
    </div>
  )
}
