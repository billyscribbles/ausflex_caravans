import SEO from '../lib/seo.jsx'
import Range from '../components/Range.jsx'
import FAQ from '../components/FAQ.jsx'
import ContactCTA from '../components/ContactCTA.jsx'
import { useVans } from '../lib/contentStore.js'

export default function VansPage() {
  const { vans } = useVans()

  return (
    <main>
      <SEO
        title="Our Vans"
        description="The Ausflex range: from the 12ft Tuff Mudder to the 21.6ft Extreme Family and custom on-site vans up to 32 feet. Every van made to order in Campbellfield, Victoria."
        path="/vans"
      />
      <header className="page-hero">
        <div className="container">
          <span className="section-eyebrow">{vans.eyebrow}</span>
          <h1 className="page-hero__title">{vans.heading}</h1>
          <p className="page-hero__sub">{vans.sub}</p>
        </div>
      </header>
      <Range showHead={false} />
      <FAQ />
      <ContactCTA />
    </main>
  )
}
