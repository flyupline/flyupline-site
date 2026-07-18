import Reveal from '../ui/Reveal.jsx'
import { IconStar } from '../ui/Icons.jsx'

const testimonials = [
  {
    author: 'Ahmed R.',
    quote:
      "I had an issue with my booking, and FlyUp Line's support team was incredibly helpful. They responded fast and resolved everything within hours. I've never had such a smooth experience with a travel agency before!",
  },
  {
    author: 'Jessica M.',
    quote:
      "FlyUp Line took care of all my travel details, and I didn't have to worry about a thing. From getting the best flight options to receiving quick confirmations, everything was handled professionally. I'll definitely book with them again!",
  },
  {
    author: 'Sarah L.',
    quote:
      'I was looking for an affordable last-minute flight, and FlyUp Line made it so easy! Their team quickly found me the best deal, and the entire booking process was seamless. I highly recommend them for budget-friendly flights!',
  },
]

export default function Testimonials() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <Reveal className="section-head center">
          <span className="eyebrow">Testimonials</span>
          <h2 className="h2">What our travelers say</h2>
          <p className="lead">
            Our customers are at the heart of everything we do — here&apos;s how the
            experience feels from their side.
          </p>
        </Reveal>
        <div className="testi-grid">
          {testimonials.map(({ author, quote }, i) => (
            <Reveal className="testi-card" key={author} delay={i * 90}>
              <div className="testi-stars" aria-label="5 out of 5 stars">
                {[...Array(5)].map((_, s) => (
                  <IconStar key={s} />
                ))}
              </div>
              <blockquote>“{quote}”</blockquote>
              <cite>{author}</cite>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
