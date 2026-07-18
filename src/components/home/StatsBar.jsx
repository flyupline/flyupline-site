import { IconClock, IconHeadset, IconGlobe, IconShield } from '../ui/Icons.jsx'

const stats = [
  { Icon: IconClock, title: '24-hour response', text: 'Personalized options, fast' },
  { Icon: IconHeadset, title: '24/7 human support', text: 'Real people, every step' },
  { Icon: IconGlobe, title: 'Worldwide coverage', text: 'Flights across the globe' },
  { Icon: IconShield, title: 'Secure payments', text: 'Visa, Mastercard, PayPal & more' },
]

export default function StatsBar() {
  return (
    <section className="stats-bar" aria-label="Why travelers trust FlyUp Line">
      <div className="container inner">
        {stats.map(({ Icon, title, text }) => (
          <div className="stat" key={title}>
            <div className="ico"><Icon /></div>
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
