import { useState } from 'react'
import PageHero from '../components/PageHero.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import { SuccessPanel, ErrorNotice } from '../components/booking/FormFeedback.jsx'
import { submitRequest } from '../lib/submitRequest.js'
import { EMAIL_PATTERN, PHONE_PATTERN } from '../lib/validation.js'
import usePageMeta from '../lib/usePageMeta.js'
import { IconPhone, IconMail, IconClock } from '../components/ui/Icons.jsx'

export default function Contact() {
  const [status, setStatus] = useState('idle')
  usePageMeta(
    'Contact Us — FlyUp Line',
    'Reach the FlyUp Line team anytime — 24/7 support by phone or email for flight quotes, bookings, and travel questions.'
  )

  const onSubmit = async (e) => {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    try {
      await submitRequest('Contact enquiry', e.target)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <PageHero
        title="Contact Us"
        lead="Questions, changes, or a trip you're dreaming about — we're here around the clock."
        bg="/assets/img/innerpage/inner-banner-contact-bg.png"
      />
      <div className="container section-tight">
        <div className="contact-layout">
          <Reveal>
            <div className="info-card">
              <div className="ico"><IconPhone /></div>
              <div>
                <h3>Phone</h3>
                <a href="tel:+201205295295">+20 120 529 5295</a>
              </div>
            </div>
            <div className="info-card">
              <div className="ico"><IconMail /></div>
              <div>
                <h3>Email</h3>
                <a href="mailto:flyupline.booking@gmail.com">flyupline.booking@gmail.com</a>
              </div>
            </div>
            <div className="info-card">
              <div className="ico"><IconClock /></div>
              <div>
                <h3>Opening hours</h3>
                <span>24 / 7 — every day</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            {status === 'success' ? (
              <SuccessPanel onReset={() => setStatus('idle')} resetLabel="Send another message" />
            ) : (
              <div className="panel">
                <h2 className="h3" style={{ marginBottom: 24 }}>Reach us anytime</h2>
                {status === 'error' && <ErrorNotice />}
                <form onSubmit={onSubmit}>
                  <div className="form-grid">
                    <div className="field full">
                      <label>Full name*</label>
                      <input name="name" type="text" placeholder="Full name" required minLength={2} autoComplete="name" title="Please enter your full name." />
                    </div>
                    <div className="field">
                      <label>Email*</label>
                      <input name="email" type="email" placeholder="you@email.com" required pattern={EMAIL_PATTERN} autoComplete="email" title="Enter a valid email address, e.g. you@email.com." />
                    </div>
                    <div className="field">
                      <label>Phone (optional)</label>
                      <input name="phone" type="tel" placeholder="e.g. +20 120 529 5295" pattern={PHONE_PATTERN} autoComplete="tel" title="Enter a valid phone number (7–20 digits), or leave blank." />
                    </div>
                    <div className="field full">
                      <label>Your message*</label>
                      <textarea name="message" placeholder="How can we help with your trip?" required minLength={5}></textarea>
                    </div>
                  </div>
                  <div className="form-foot" style={{ alignItems: 'flex-start' }}>
                    <input type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ display: 'none' }} />
                    <button className="btn btn-primary btn-lg" type="submit" disabled={status === 'sending'}>
                      {status === 'sending' ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </>
  )
}
