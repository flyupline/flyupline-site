import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { IconMenu, IconX, IconPhone, IconMail } from './ui/Icons.jsx'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/flight-booking', label: 'Request a Quote' },
  { to: '/contact', label: 'Contact' },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div className="container inner">
          <Link to="/" className="logo" aria-label="FlyUp Line — home">
            <img src="/assets/img/logo2.png" alt="FlyUp Line" />
          </Link>
          <nav className="site-nav" aria-label="Main">
            {navItems.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <Link to="/flight-booking" className="btn btn-primary">Request a Flight Quote</Link>
            <button className="menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}>
              <IconMenu />
            </button>
          </div>
        </div>
      </header>

      <div className={`mobile-menu${open ? ' open' : ''}`} aria-hidden={!open}>
        <div className="top">
          <img src="/assets/img/logo2.png" alt="FlyUp Line" />
          <button className="menu-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
            <IconX />
          </button>
        </div>
        <nav aria-label="Mobile">
          {navItems.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="menu-cta">
          <div className="menu-contact">
            <a href="tel:+201205295295"><IconPhone style={{ width: 16, height: 16, marginRight: 8 }} /> +20 120 529 5295</a>
            <a href="mailto:flyupline.booking@gmail.com"><IconMail style={{ width: 16, height: 16, marginRight: 8 }} /> flyupline.booking@gmail.com</a>
          </div>
          <Link to="/flight-booking" className="btn btn-primary btn-lg">Request a Flight Quote</Link>
        </div>
      </div>
    </>
  )
}
