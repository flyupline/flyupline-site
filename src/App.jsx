import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import FlightBooking from './pages/FlightBooking.jsx'
import Contact from './pages/Contact.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import TermsConditions from './pages/TermsConditions.jsx'
import NotFound from './pages/NotFound.jsx'

// Admin + customer-quote code (and Supabase) load only on their own routes,
// keeping the marketing pages lean.
const QuoteView = lazy(() => import('./pages/QuoteView.jsx'))
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function App() {
  const { pathname } = useLocation()
  const bare = pathname.startsWith('/admin') || pathname.startsWith('/quote')

  return (
    <>
      <ScrollToTop />
      {!bare && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/flight-booking" element={<FlightBooking />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/quote/:token" element={<Suspense fallback={<div className="q-state"><div className="admin-spinner" /></div>}><QuoteView /></Suspense>} />
          <Route path="/admin/*" element={<Suspense fallback={<div className="admin-boot"><div className="admin-spinner" /></div>}><AdminApp /></Suspense>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!bare && <Footer />}
    </>
  )
}

export default App
