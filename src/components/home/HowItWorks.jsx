import Reveal from '../ui/Reveal.jsx'

const steps = [
  {
    title: 'Tell us your travel plans',
    text: 'Share your route, dates, travelers, and any special requests through our simple quote form.',
  },
  {
    title: 'Our experts search for you',
    text: 'We check consolidator fares and deals across our airline partners to find the best available options.',
  },
  {
    title: 'Receive personalized options',
    text: 'Within 24 hours you get hand-picked flight choices with a clear price breakdown by email.',
  },
  {
    title: 'Confirm and fly',
    text: 'Choose the option you love — we finalize the booking securely and support you until you land.',
  },
]

export default function HowItWorks() {
  return (
    <section className="section" id="how-it-works">
      <div className="container">
        <Reveal className="section-head center">
          <span className="eyebrow">Simple &amp; personal</span>
          <h2 className="h2">How FlyUp Line works</h2>
          <p className="lead">
            No search engines, no hidden fees — just a travel team that does the
            hard work for you.
          </p>
        </Reveal>
        <div className="steps-grid">
          {steps.map(({ title, text }, i) => (
            <Reveal className="step-card" key={title} delay={i * 90}>
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
