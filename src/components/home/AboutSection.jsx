import { Link } from 'react-router-dom'
import Reveal from '../ui/Reveal.jsx'
import { IconCheck, IconArrowRight } from '../ui/Icons.jsx'

const points = [
  'Consolidator & net-fare airline agreements',
  'Custom holiday & group itineraries',
  'Safety-first, fully supported travel',
  'Unbeatable prices on leisure & business trips',
]

export default function AboutSection() {
  return (
    <section className="section">
      <div className="container split">
        <Reveal className="split-media">
          <img src="/assets/img/home2/home2-about-img1.png" alt="The FlyUp Line travel experience" loading="lazy" />
          <div className="badge-card">
            <strong>02</strong>
            <span>Years of trusted<br />travel expertise</span>
          </div>
        </Reveal>
        <Reveal className="split-body" delay={100}>
          <span className="eyebrow">About FlyUp Line</span>
          <h2 className="h2">Elevating your travel experience</h2>
          <p className="lead">
            We&apos;re a travel agency built on affordability, convenience, and genuinely
            personal service. Through consolidator agreements with most major airlines,
            we secure competitive rates and exclusive offers you won&apos;t find on
            public search engines — then handle every detail of the booking for you.
          </p>
          <ul className="check-list">
            {points.map((p) => (
              <li key={p}><IconCheck /> {p}</li>
            ))}
          </ul>
          <Link to="/about" className="text-link">
            More about us <IconArrowRight />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
