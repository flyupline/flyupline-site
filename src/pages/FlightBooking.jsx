import { useState } from 'react'
import PageHero from '../components/PageHero.jsx'
import AirportField from '../components/booking/AirportField.jsx'
import PassengerDropdown from '../components/booking/PassengerDropdown.jsx'
import { DateRangeField, SingleDateField } from '../components/booking/DateField.jsx'
import { SuccessPanel, ErrorNotice } from '../components/booking/FormFeedback.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import { submitRequest } from '../lib/submitRequest.js'
import { EMAIL_PATTERN, PHONE_PATTERN } from '../lib/validation.js'
import usePageMeta from '../lib/usePageMeta.js'
import { IconShield, IconClock, IconTag, IconHeadset, IconPhone, IconMail, IconCheck, IconPlus, IconX } from '../components/ui/Icons.jsx'

function CabinClassField() {
  return (
    <div className="field">
      <label>Cabin class</label>
      <select name="cabin_class" defaultValue="Economy">
        <option>Economy</option>
        <option>Business</option>
        <option>First Class</option>
      </select>
    </div>
  )
}

function PersonalFields() {
  return (
    <>
      <h3 className="h3" style={{ margin: '36px 0 20px' }}>Your contact details</h3>
      <div className="form-grid">
        <div className="field full">
          <label>Full name*</label>
          <input
            name="fullname"
            type="text"
            placeholder="Full name"
            required
            minLength={2}
            autoComplete="name"
            title="Please enter your full name."
          />
        </div>
        <div className="field">
          <label>Email*</label>
          <input
            name="email"
            type="email"
            placeholder="you@email.com"
            required
            pattern={EMAIL_PATTERN}
            autoComplete="email"
            title="Enter a valid email address, e.g. you@email.com — this is where we'll send your options."
          />
        </div>
        <div className="field">
          <label>Phone (optional)</label>
          <input
            name="phone"
            type="tel"
            placeholder="e.g. +20 120 529 5295"
            pattern={PHONE_PATTERN}
            autoComplete="tel"
            title="Enter a valid phone number (7–20 digits), or leave blank."
          />
        </div>
        <div className="field full">
          <label>Notes (optional)</label>
          <textarea name="message" placeholder="Seat preferences, baggage, special requests..."></textarea>
        </div>
      </div>
    </>
  )
}

function FormFoot({ sending }) {
  return (
    <div className="form-foot">
      <input type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ display: 'none' }} />
      <button type="submit" className="btn btn-primary btn-lg" disabled={sending}>
        {sending ? 'Sending...' : 'Request My Quote'}
      </button>
      <ul className="reassure">
        <li><IconCheck /> Free, no-obligation quote</li>
        <li><IconCheck /> Response within 24 hours</li>
        <li><IconCheck /> No payment needed now</li>
      </ul>
    </div>
  )
}

function useQuoteForm(endpoint) {
  const [status, setStatus] = useState('idle')

  const onSubmit = async (e) => {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    try {
      await submitRequest(endpoint, e.target)
      setStatus('success')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setStatus('error')
    }
  }

  return { status, setStatus, onSubmit }
}

function RoundtripForm() {
  const { status, setStatus, onSubmit } = useQuoteForm('Roundtrip flight quote request')
  if (status === 'success') return <SuccessPanel onReset={() => setStatus('idle')} resetLabel="Request another quote" />

  return (
    <form onSubmit={onSubmit}>
      {status === 'error' && <ErrorNotice />}
      <div className="form-grid">
        <AirportField label="From" name="from[]" placeholder="City or airport" />
        <AirportField label="To" name="to[]" placeholder="City or airport" />
        <DateRangeField name="multiCityDate4" label="Travel dates" />
        <CabinClassField />
        <PassengerDropdown />
      </div>
      <PersonalFields />
      <FormFoot sending={status === 'sending'} />
    </form>
  )
}

function OnewayForm() {
  const { status, setStatus, onSubmit } = useQuoteForm('One-way flight quote request')
  if (status === 'success') return <SuccessPanel onReset={() => setStatus('idle')} resetLabel="Request another quote" />

  return (
    <form onSubmit={onSubmit}>
      {status === 'error' && <ErrorNotice />}
      <div className="form-grid">
        <AirportField label="From" name="from[]" placeholder="City or airport" />
        <AirportField label="To" name="to[]" placeholder="City or airport" />
        <SingleDateField name="onewaydate" label="Departure date" />
        <CabinClassField />
        <PassengerDropdown />
      </div>
      <PersonalFields />
      <FormFoot sending={status === 'sending'} />
    </form>
  )
}

function MulticityForm() {
  const { status, setStatus, onSubmit } = useQuoteForm('Multi-city flight quote request')
  const [extraTrip, setExtraTrip] = useState(false)
  if (status === 'success') return <SuccessPanel onReset={() => setStatus('idle')} resetLabel="Request another quote" />

  return (
    <form onSubmit={onSubmit}>
      {status === 'error' && <ErrorNotice />}

      <div className="trip-row">
        <span className="tag">Trip 1</span>
        <div className="form-grid">
          <AirportField label="From" name="from[]" placeholder="City or airport" />
          <AirportField label="To" name="to[]" placeholder="City or airport" />
          <DateRangeField name="multiCityDate1" label="Dates" />
        </div>
      </div>

      <div className="trip-row">
        <span className="tag">Trip 2</span>
        <div className="form-grid">
          <AirportField label="From" name="from[]" placeholder="City or airport" />
          <AirportField label="To" name="to[]" placeholder="City or airport" />
          <DateRangeField name="multiCityDate2" label="Dates" />
        </div>
      </div>

      {extraTrip && (
        <div className="trip-row">
          <span className="tag">Trip 3</span>
          <div className="form-grid">
            <AirportField label="From" name="from[]" placeholder="City or airport" required={extraTrip} />
            <AirportField label="To" name="to[]" placeholder="City or airport" required={extraTrip} />
            <DateRangeField name="multiCityDate3" label="Dates" required={extraTrip} defaultToWeek={false} />
          </div>
        </div>
      )}

      <button type="button" className="add-trip" onClick={() => setExtraTrip((v) => !v)}>
        {extraTrip ? <><IconX style={{ width: 16, height: 16 }} /> Remove trip 3</> : <><IconPlus style={{ width: 16, height: 16 }} /> Add another trip</>}
      </button>

      <div className="form-grid">
        <CabinClassField />
        <PassengerDropdown />
      </div>
      <PersonalFields />
      <FormFoot sending={status === 'sending'} />
    </form>
  )
}

const tripTabs = [
  { id: 'roundtrip', label: 'Roundtrip', Form: RoundtripForm },
  { id: 'oneway', label: 'One-way', Form: OnewayForm },
  { id: 'multicity', label: 'Multi-city', Form: MulticityForm },
]

export default function FlightBooking() {
  const [activeTab, setActiveTab] = useState('roundtrip')
  usePageMeta(
    'Request a Flight Quote — FlyUp Line',
    'Tell us your travel plans and FlyUp Line’s travel experts will send you personalized flight options and prices within 24 hours. Free, no-obligation quotes.'
  )

  const ActiveForm = tripTabs.find((t) => t.id === activeTab).Form

  return (
    <>
      <PageHero
        title="Request a Flight Quote"
        crumb="Request a Quote"
        lead="Share your trip details and our travel experts will hand-pick the best available fares for you — free, and with no obligation."
        bg="/assets/img/innerpage/inner-banner-flight-booking-bg.jpg"
      />
      <div className="container section-tight">
        <div className="quote-layout">
          <Reveal className="panel">
            <div className="segmented" role="tablist" aria-label="Trip type">
              {tripTabs.map(({ id, label }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activeTab === id}
                  className={activeTab === id ? 'active' : undefined}
                  onClick={() => setActiveTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <ActiveForm />
          </Reveal>

          <Reveal className="aside-card" delay={120}>
            <h3>Your personal travel team</h3>
            <ul className="aside-list">
              <li><IconClock /> Hand-picked flight options in your inbox within 24 hours.</li>
              <li><IconTag /> Consolidator fares you won&apos;t find on public search engines.</li>
              <li><IconHeadset /> A real person supports you before, during, and after your trip.</li>
              <li><IconShield /> Secure payment only after you confirm your booking.</li>
            </ul>
            <div className="aside-contact">
              <span>Prefer to talk it through?</span>
              <a href="tel:+201205295295"><IconPhone /> +20 120 529 5295</a>
              <a href="mailto:flyupline.booking@gmail.com"><IconMail /> flyupline.booking@gmail.com</a>
            </div>
          </Reveal>
        </div>
      </div>
    </>
  )
}
