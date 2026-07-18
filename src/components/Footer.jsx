import { Link } from 'react-router-dom'
import { IconPhone, IconMail, IconClock, IconFacebook, IconInstagram, IconTwitterX } from './ui/Icons.jsx'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/"><img src="/assets/img/footer-logo.png" alt="FlyUp Line" /></Link>
            <p>Fast booking, low prices, happy journeys. Your personal travel team for hand-picked flight options worldwide.</p>
            <Link to="/flight-booking" className="btn btn-primary">Request a Flight Quote</Link>
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/flight-booking">Request a Quote</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-conditions">Terms &amp; Conditions</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Contact</h4>
            <ul className="footer-contact">
              <li><IconPhone /><a href="tel:+201205295295">+20 120 529 5295</a></li>
              <li><IconMail /><a href="mailto:flyupline.booking@gmail.com">flyupline.booking@gmail.com</a></li>
              <li><IconClock /><span>Available 24 / 7</span></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Secure Payments</h4>
            <p className="muted" style={{ fontSize: '0.94rem' }}>Pay safely once your booking is confirmed.</p>
            <ul className="payments">
              <li><img src="/assets/img/home1/icon/visa-logo.svg" alt="Visa" loading="lazy" /></li>
              <li><img src="/assets/img/home1/icon/master-card.png" alt="Mastercard" loading="lazy" /></li>
              <li><img src="/assets/img/home1/icon/paypal-logo.svg" alt="PayPal" loading="lazy" /></li>
              <li><img src="/assets/img/home1/icon/e-transfer.png" alt="Interac e-Transfer" loading="lazy" /></li>
              <li><img src="/assets/img/home1/icon/skrill-logo.svg" alt="Skrill" loading="lazy" /></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>©2025 FlyUp Line. All rights reserved. | Designed &amp; developed by Graphxify</span>
          <div className="social-row">
            <a href="https://www.facebook.com/share/1Xm2pf4WSC/" target="_blank" rel="noreferrer" aria-label="FlyUp Line on Facebook"><IconFacebook /></a>
            <a href="https://x.com/FlyupLine" target="_blank" rel="noreferrer" aria-label="FlyUp Line on X"><IconTwitterX /></a>
            <a href="https://www.instagram.com/flyupline/" target="_blank" rel="noreferrer" aria-label="FlyUp Line on Instagram"><IconInstagram /></a>
          </div>
        </div>
      </div>
    </footer>
  )
}
