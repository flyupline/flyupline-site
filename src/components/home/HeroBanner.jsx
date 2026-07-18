import { Link } from 'react-router-dom'
import Reveal from '../ui/Reveal.jsx'
import { IconCheck, IconArrowRight } from '../ui/Icons.jsx'

export default function HeroBanner() {
  return (
    <section className="hero">
      <div
        className="hero-bg"
        style={{ backgroundImage: 'url(/assets/img/home2/vacation-flyup-line-banner.jpg)' }}
        role="img"
        aria-label="Traveler overlooking a turquoise coastline"
      ></div>
      <div className="hero-scrim"></div>
      <div className="container">
        <div className="hero-content">
          <Reveal>
            <span className="eyebrow">Your journey, our expertise</span>
            <h1 className="display">
              The right flight, <span className="accent">found for you.</span>
            </h1>
            <p className="lead">
              FlyUp Line is your personal travel team. Tell us where you&apos;re going —
              our experts search fares across major airlines and send you hand-picked
              options within 24 hours.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="hero-actions">
              <Link to="/flight-booking" className="btn btn-primary btn-lg">
                Request a Flight Quote <IconArrowRight />
              </Link>
              <a href="#how-it-works" className="btn btn-ghost btn-lg">See how it works</a>
            </div>
          </Reveal>
          <Reveal delay={220}>
            <ul className="hero-trust">
              <li><IconCheck /> Free, no-obligation quotes</li>
              <li><IconCheck /> Response within 24 hours</li>
              <li><IconCheck /> 24/7 human support</li>
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
