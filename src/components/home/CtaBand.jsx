import { Link } from 'react-router-dom'
import Reveal from '../ui/Reveal.jsx'
import { IconPhone, IconMail, IconArrowRight } from '../ui/Icons.jsx'

export default function CtaBand() {
  return (
    <section className="section" style={{ paddingTop: 0, paddingBottom: 0 }}>
      <div className="container">
        <Reveal className="cta-band">
          <span className="eyebrow">Ready when you are</span>
          <h2 className="h2">Let&apos;s find your next flight</h2>
          <p className="lead">
            Share your travel plans and get hand-picked flight options with prices
            in your inbox within 24 hours — free, with no obligation.
          </p>
          <Link to="/flight-booking" className="btn btn-primary btn-lg">
            Request a Flight Quote <IconArrowRight />
          </Link>
          <div className="cta-contacts">
            <a href="tel:+201205295295"><IconPhone /> +20 120 529 5295</a>
            <a href="mailto:flyupline.booking@gmail.com"><IconMail /> flyupline.booking@gmail.com</a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
