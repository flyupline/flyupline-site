import { useState } from 'react'
import Reveal from '../ui/Reveal.jsx'
import { IconChevronDown } from '../ui/Icons.jsx'

const faqs = [
  {
    q: 'How do I book a flight with FlyUp Line?',
    a: 'Simply submit a quote request with your route, dates, and travelers. Our experts search the best available fares and email you personalized options within 24 hours. Once you choose one, we complete the booking for you.',
  },
  {
    q: 'Do I pay anything when I request a quote?',
    a: 'No — quotes are completely free and come with no obligation. You only pay once you’ve chosen a flight option and confirmed your booking with our team.',
  },
  {
    q: 'How fast will I receive my flight options?',
    a: 'Our team processes requests around the clock and sends personalized options with a clear price breakdown within 24 hours.',
  },
  {
    q: 'Which payment methods do you accept?',
    a: 'We accept Visa, Mastercard, PayPal, Interac e-Transfer, and Skrill. All payments are processed securely once your booking is confirmed.',
  },
  {
    q: 'Can I change my booking after it’s confirmed?',
    a: 'Yes — we offer flexible travel options including refundable tickets and date changes. Change fees and policies depend on the airline, and our team will walk you through them before you commit.',
  },
]

export default function FaqSection() {
  const [open, setOpen] = useState(0)

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <Reveal className="section-head center">
          <span className="eyebrow">Good to know</span>
          <h2 className="h2">Frequently asked questions</h2>
        </Reveal>
        <div className="faq-list">
          {faqs.map(({ q, a }, i) => (
            <Reveal key={q} delay={i * 60}>
              <div className={`faq-item${open === i ? ' open' : ''}`}>
                <button
                  className="faq-q"
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? -1 : i)}
                >
                  {q}
                  <IconChevronDown />
                </button>
                <div className="faq-a">
                  <div className="faq-a-inner">{a}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
