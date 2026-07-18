import { IconCheck, IconAlert } from '../ui/Icons.jsx'

export function SuccessPanel({ onReset, resetLabel = 'Send another request' }) {
  return (
    <div className="panel success-panel" role="status">
      <div className="mark"><IconCheck /></div>
      <h3>Request received — thank you!</h3>
      <p>
        Our travel experts are already on it. You&apos;ll receive your personalized
        flight options and prices by email within 24 hours.
      </p>
      <p>
        Need anything sooner? Call <a href="tel:+201205295295">+20 120 529 5295</a> or email{' '}
        <a href="mailto:flyupline.booking@gmail.com">flyupline.booking@gmail.com</a>.
      </p>
      <button type="button" className="btn btn-primary" onClick={onReset}>{resetLabel}</button>
    </div>
  )
}

export function ErrorNotice() {
  return (
    <div className="error-notice" role="alert">
      <IconAlert />
      <div>
        <strong>Something went wrong sending your request.</strong>
        <p style={{ margin: '4px 0 0' }}>
          Please try again in a moment — or reach us directly at{' '}
          <a href="tel:+201205295295">+20 120 529 5295</a> /{' '}
          <a href="mailto:flyupline.booking@gmail.com">flyupline.booking@gmail.com</a> and
          we&apos;ll take care of you right away.
        </p>
      </div>
    </div>
  )
}
