import SEO from '../lib/seo.jsx'
import Hero from '../components/Hero.jsx'
import Stats from '../components/Stats.jsx'
import Range from '../components/Range.jsx'
import VideoEmbed from '../components/VideoEmbed.jsx'
import VirtualTour from '../components/VirtualTour.jsx'
import Feature from '../components/Feature.jsx'
import InteriorsRail from '../components/InteriorsRail.jsx'
import HowItWorks from '../components/HowItWorks.jsx'
import Contact from '../components/Contact.jsx'
import { gallery } from '../content/gallery.js'

export default function Home() {
  return (
    <main>
      <SEO />
      <Hero />
      <Stats />
      <Range />
      <VideoEmbed />
      <VirtualTour />
      <Feature />
      <InteriorsRail content={gallery.interiors} id="interiors" />
      <HowItWorks />
      <Contact />
    </main>
  )
}
