import SEO from '../lib/seo.jsx'
import Hero from '../components/Hero.jsx'
import Services from '../components/Services.jsx'
import Stats from '../components/Stats.jsx'
import Range from '../components/Range.jsx'
import Feature from '../components/Feature.jsx'
import GalleryGrid from '../components/GalleryGrid.jsx'
import HowItWorks from '../components/HowItWorks.jsx'
import FAQ from '../components/FAQ.jsx'
import DealerBanner from '../components/DealerBanner.jsx'
import Contact from '../components/Contact.jsx'
import { gallery } from '../content/gallery.js'

export default function Home() {
  return (
    <main>
      <SEO />
      <Hero />
      <Services />
      <Stats />
      <Range />
      <Feature />
      <GalleryGrid content={gallery.interiors} id="interiors" />
      <HowItWorks />
      <FAQ />
      <DealerBanner />
      <Contact />
    </main>
  )
}
