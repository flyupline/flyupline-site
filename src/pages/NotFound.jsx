import { Link } from 'react-router-dom'
import usePageMeta from '../lib/usePageMeta.js'
import PageHero from '../components/PageHero.jsx'
import { IconArrowRight } from '../components/ui/Icons.jsx'

export default function NotFound() {
  usePageMeta('Page Not Found — FlyUp Line', 'The page you were looking for could not be found.')
  return (
    <>
      <PageHero title="Page Not Found" crumb="404" />
      <div className="container section-tight" style={{ textAlign: 'center' }}>
        <p className="lead" style={{ margin: '0 auto 32px' }}>
          The link may be outdated or mistyped. Head back home, or request a flight
          quote and our travel experts will take it from there.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-ghost">Back to Home</Link>
          <Link to="/flight-booking" className="btn btn-primary">
            Request a Flight Quote <IconArrowRight />
          </Link>
        </div>
      </div>
    </>
  )
}
