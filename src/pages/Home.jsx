import usePageMeta from '../lib/usePageMeta.js'
import HeroBanner from '../components/home/HeroBanner.jsx'
import StatsBar from '../components/home/StatsBar.jsx'
import AboutSection from '../components/home/AboutSection.jsx'
import HowItWorks from '../components/home/HowItWorks.jsx'
import DestinationsSlider from '../components/home/DestinationsSlider.jsx'
import ServicesTabs from '../components/home/ServicesTabs.jsx'
import Testimonials from '../components/home/Testimonials.jsx'
import FaqSection from '../components/home/FaqSection.jsx'
import CtaBand from '../components/home/CtaBand.jsx'

export default function Home() {
  usePageMeta(
    'FlyUp Line — Your Trusted Flight Booking Agency',
    'FlyUp Line finds you the best available flights worldwide. Request a free flight quote and our travel experts will send personalized options and prices within 24 hours.'
  )
  return (
    <>
      <HeroBanner />
      <StatsBar />
      <AboutSection />
      <HowItWorks />
      <DestinationsSlider />
      <ServicesTabs />
      <Testimonials />
      <FaqSection />
      <CtaBand />
    </>
  )
}
