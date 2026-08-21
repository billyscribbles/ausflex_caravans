import SEO from '../lib/seo.jsx'
import Hero from '../components/Hero.jsx'
import Stats from '../components/Stats.jsx'
import Range from '../components/Range.jsx'
import VideoEmbed from '../components/VideoEmbed.jsx'
import VirtualTour from '../components/VirtualTour.jsx'
import Feature from '../components/Feature.jsx'
import InteriorsRail from '../components/InteriorsRail.jsx'
import HowItWorks from '../components/HowItWorks.jsx'
import ContactCTA from '../components/ContactCTA.jsx'
import { gallery } from '../content/gallery.js'
import { useTours } from '../lib/contentStore.js'

export default function Home() {
  const { tours } = useTours()

  return (
    <main>
      <SEO />
      <Hero />
      <Stats />
      <Range />
      <VideoEmbed />
      <VirtualTour tours={tours} />
      <Feature />
      <InteriorsRail content={gallery.interiors} id="interiors" />
      <HowItWorks />
      <ContactCTA />
    </main>
  )
}
