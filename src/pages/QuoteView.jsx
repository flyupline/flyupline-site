import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { publicGet, publicPost } from '../lib/adminApi.js'
import QuoteDisplay from '../components/quote/QuoteDisplay.jsx'
import usePageMeta from '../lib/usePageMeta.js'

const RESPONDED = { accept: 'accepted', decline: 'declined', request_changes: 'changes requested' }

export default function QuoteView() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { type, option }
  const [done, setDone] = useState(null)
  usePageMeta('Your Travel Quote — FlyUp Line', 'View your personalised FlyUp Line travel quote.')

  const load = async () => {
    try {
      setData(await publicGet('/api/quote-view?token=' + token))
    } catch (e) {
      setError(e.message || 'This quote link is invalid.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [token])

  if (loading) return <div className="q-state"><div className="admin-spinner" /></div>
  if (error) return (
    <div className="q-state">
      <img src="/assets/img/logo2.png" alt="FlyUp Line" className="q-logo" />
      <h1>Quote unavailable</h1>
      <p>{error}</p>
      <a className="btn btn-primary" href="/flight-booking">Request a new quote</a>
    </div>
  )

  const already = data.responded
  const v = data.version

  return (
    <div className="q-page">
      <header className="q-header no-print">
        <img src="/assets/img/logo2.png" alt="FlyUp Line" />
        <div className="q-header-actions">
          <button className="btn btn-ghost" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </header>

      <div className="q-page-body">
        <div className="q-hero">
          <span className="eyebrow">Your personalised quote</span>
          <h1>{data.destination ? `Your trip to ${data.destination}` : 'Your travel quote'}</h1>
          <p className="muted">Prepared for {data.customerName || 'you'} · Reference {data.reference}</p>
        </div>

        {done && (
          <div className="q-result">
            <div className="q-result-mark">✓</div>
            <h2>Thank you — your response is recorded.</h2>
            <p>{done === 'accept'
              ? 'You’ve accepted this option. This confirms your interest and lets our team proceed with the booking and payment process — it is not yet a confirmed booking. We’ll be in touch shortly to finalise everything.'
              : done === 'request_changes'
                ? 'We’ve received your requested changes and our team will get back to you with an updated quote.'
                : 'We’ve recorded your response. Thank you for considering FlyUp Line.'}</p>
            <p className="muted">Questions? Call +20 120 529 5295 or email flyupline.booking@gmail.com</p>
          </div>
        )}

        {already && !done && (
          <div className="q-notice">This quote was already <strong>{RESPONDED[already.type] || already.type}</strong>. Contact us if you need anything else.</div>
        )}
        {data.expired && !done && (
          <div className="q-notice warn">This quote has expired. Please contact us for an updated quote.</div>
        )}

        <QuoteDisplay
          data={data}
          selectable={!done && !already && !data.expired}
          onSelect={(option) => setModal({ type: 'accept', option })}
        />

        {!done && !already && !data.expired && (
          <div className="q-actions no-print">
            <p className="q-disclaimer">Accepting an option confirms your interest and allows FlyUp Line to proceed with booking — it is not a confirmed booking until finalised by our team.</p>
            <div className="q-action-row">
              <button className="btn btn-ghost" onClick={() => setModal({ type: 'request_changes' })}>Request changes</button>
              <button className="btn btn-ghost" onClick={() => setModal({ type: 'decline' })}>Decline</button>
              <a className="btn btn-ghost" href="mailto:flyupline.booking@gmail.com">Contact us</a>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <ResponseModal
          modal={modal}
          data={data}
          token={token}
          onClose={() => setModal(null)}
          onDone={(type) => { setModal(null); setDone(type); load() }}
        />
      )}
    </div>
  )
}

function ResponseModal({ modal, data, token, onClose, onDone }) {
  const [form, setForm] = useState({ full_name: data.customerName || '', email: '', phone: '', agreed: false, reason: 'Price too high', message: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = async () => {
    setErr('')
    setBusy(true)
    try {
      if (modal.type === 'accept') {
        await publicPost('/api/quote-respond', { token, type: 'accept', optionId: modal.option.id, full_name: form.full_name, email: form.email, phone: form.phone, agreed_terms: form.agreed })
      } else if (modal.type === 'decline') {
        await publicPost('/api/quote-respond', { token, type: 'decline', reason: form.reason, message: form.message })
      } else {
        if (!form.message.trim()) throw new Error('Please describe the changes you’d like.')
        await publicPost('/api/quote-respond', { token, type: 'request_changes', message: form.message })
      }
      onDone(modal.type)
    } catch (e) {
      setErr(e.message || 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="q-modal" onClick={(e) => e.stopPropagation()}>
        {modal.type === 'accept' && (
          <>
            <h3>Accept “{modal.option.title || 'this option'}”</h3>
            <p className="muted">Confirm your details to proceed. This confirms your interest — not a final booking.</p>
            <label className="qb-field"><span>Full name*</span><input value={form.full_name} onChange={set('full_name')} /></label>
            <label className="qb-field"><span>Email*</span><input type="email" value={form.email} onChange={set('email')} /></label>
            <label className="qb-field"><span>Phone</span><input value={form.phone} onChange={set('phone')} /></label>
            <label className="q-agree"><input type="checkbox" checked={form.agreed} onChange={set('agreed')} /> I agree to the terms and conditions of this quote.</label>
          </>
        )}
        {modal.type === 'decline' && (
          <>
            <h3>Decline this quote</h3>
            <label className="qb-field"><span>Reason (optional)</span>
              <select value={form.reason} onChange={set('reason')}>
                {['Price too high', 'Travel plans changed', 'Chose another agency', 'Dates do not work', 'Other'].map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
            <label className="qb-field"><span>Anything else? (optional)</span><textarea rows={3} value={form.message} onChange={set('message')} /></label>
          </>
        )}
        {modal.type === 'request_changes' && (
          <>
            <h3>Request changes</h3>
            <p className="muted">Tell us what you’d like adjusted — dates, hotel, price, baggage, flights, travellers…</p>
            <label className="qb-field"><span>Your message*</span><textarea rows={4} value={form.message} onChange={set('message')} /></label>
          </>
        )}
        {err && <div className="admin-alert error">{err}</div>}
        <div className="qb-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Submitting…' : modal.type === 'accept' ? 'Confirm acceptance' : modal.type === 'decline' ? 'Submit' : 'Send request'}</button>
        </div>
      </div>
    </div>
  )
}
