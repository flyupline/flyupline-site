import Reveal from '../ui/Reveal.jsx'
import { IconPlane, IconHeadset, IconTag, IconCalendar } from '../ui/Icons.jsx'

const services = [
  {
    Icon: IconPlane,
    title: 'Flight Booking',
    text: 'Best available fares for domestic and international travel, secured through our partnerships with major airlines.',
  },
  {
    Icon: IconHeadset,
    title: 'Customer Support',
    text: 'A dedicated team available 24/7 for changes, cancellations, special requests, and everything in between.',
  },
  {
    Icon: IconTag,
    title: 'Exclusive Deals & Discounts',
    text: 'Flash sales, limited-time promotions, and early-bird discounts on flights to popular destinations.',
  },
  {
    Icon: IconCalendar,
    title: 'Flexible Travel Options',
    text: 'Refundable tickets, open dates, and multi-city itineraries — personalized so you can travel with confidence.',
  },
]

export default function ServicesTabs() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <Reveal className="section-head center">
          <span className="eyebrow">What we do</span>
          <h2 className="h2">Making travel effortless</h2>
        </Reveal>
        <div className="services-grid">
          {services.map(({ Icon, title, text }, i) => (
            <Reveal className="service-card" key={title} delay={i * 80}>
              <div className="ico"><Icon /></div>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
