import { Link } from 'react-router-dom'
import Reveal from '../ui/Reveal.jsx'
import { IconArrowRight } from '../ui/Icons.jsx'

const destinations = [
  { name: 'Canada', img: '/assets/img/home2/destination-card2-canada.jpg' },
  { name: 'Egypt', img: '/assets/img/home2/destination-card-egypt.jpg' },
  { name: 'USA', img: '/assets/img/home2/destination-card-new-york.jpg' },
  { name: 'France', img: '/assets/img/home2/destination-card-france.jpg' },
  { name: 'Saudi Arabia', img: '/assets/img/home2/destination-card-saudi-arabia.jpg' },
  { name: 'Brazil', img: '/assets/img/home2/destination-card-brazil.jpg' },
  { name: 'Spain', img: '/assets/img/home2/destination-card-spain.jpg' },
  { name: 'Mexico', img: '/assets/img/home2/destination-card-mexico.jpg' },
  { name: 'Australia', img: '/assets/img/home2/destination-card2-img7.jpg' },
  { name: 'United Kingdom', img: '/assets/img/home2/destination-card2-united-kingdom.jpg' },
  { name: 'United Arab Emirates', img: '/assets/img/home2/destination-card2-united-arab-emirates.jpg' },
  { name: 'Greece', img: '/assets/img/home2/destination-card-greece.jpg' },
]

function DestinationSet({ hidden = false }) {
  return (
    <div className="dest-set" aria-hidden={hidden || undefined}>
      {destinations.map(({ name, img }) => (
        <Link
          to="/flight-booking"
          className="dest-card"
          key={name}
          tabIndex={hidden ? -1 : undefined}
          aria-label={hidden ? undefined : `Request a flight quote to ${name}`}
        >
          <img src={img} alt={hidden ? '' : name} loading="lazy" />
          <div className="label">
            <div>
              <span>Travel to</span>
              <h3>{name}</h3>
            </div>
            <div className="go"><IconArrowRight /></div>
          </div>
        </Link>
      ))}
    </div>
  )
}

export default function DestinationsSlider() {
  return (
    <section className="section">
      <div className="container">
        <Reveal className="dest-header">
          <div>
            <span className="eyebrow">Journey with FlyUp Line</span>
            <h2 className="h2">Trendy travel locations</h2>
          </div>
        </Reveal>
      </div>
      <div className="dest-marquee">
        <div className="dest-marquee-track">
          <DestinationSet />
          <DestinationSet hidden />
        </div>
      </div>
    </section>
  )
}
