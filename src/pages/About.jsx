import usePageMeta from '../lib/usePageMeta.js'
import PageHero from '../components/PageHero.jsx'
import AboutSection from '../components/home/AboutSection.jsx'
import StatsBar from '../components/home/StatsBar.jsx'
import HowItWorks from '../components/home/HowItWorks.jsx'
import ServicesTabs from '../components/home/ServicesTabs.jsx'
import CtaBand from '../components/home/CtaBand.jsx'

export default function About() {
  usePageMeta(
    'About Us — FlyUp Line',
    'FlyUp Line is a trusted travel agency offering airline tickets, holiday packages, and exclusive travel deals with consolidator agreements across major airlines.'
  )
  return (
    <>
      <PageHero
        title="About Us"
        lead="A travel team built on affordability, convenience, and genuinely personal service."
        bg="/assets/img/innerpage/inner-banner-about-us-bg.jpg"
      />
      <StatsBar />
      <AboutSection />
      <HowItWorks />
      <ServicesTabs />
      <CtaBand />
    </>
  )
}
