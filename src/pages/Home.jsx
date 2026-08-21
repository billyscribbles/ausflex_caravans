import SEO from '../lib/seo.jsx'
import Hero from '../components/Hero.jsx'
import Stats from '../components/Stats.jsx'
import Services from '../components/Services.jsx'
import HowItWorks from '../components/HowItWorks.jsx'
import Testimonials from '../components/Testimonials.jsx'
import FAQ from '../components/FAQ.jsx'
import Contact from '../components/Contact.jsx'

export default function Home() {
  return (
    <main>
      <SEO />
      <Hero />
      <Stats />
      <Services />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <Contact />
    </main>
  )
}
