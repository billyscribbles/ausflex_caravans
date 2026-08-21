import SEO from '../lib/seo.jsx'
import VirtualTour from '../components/VirtualTour.jsx'
import DealerBanner from '../components/DealerBanner.jsx'
import { tour } from '../content/tour.js'

export default function TourPage() {
  return (
    <main>
      <SEO
        title="360° Virtual Tour"
        description="Walk through our Australian-built caravans in full 360° — lounge, kitchen and bedrooms, exactly as they leave the Campbellfield factory."
        path="/360"
      />
      <header className="page-hero">
        <div className="container">
          <span className="section-eyebrow">{tour.page.eyebrow}</span>
          <h1 className="page-hero__title">{tour.page.heading}</h1>
          <p className="page-hero__sub">{tour.page.sub}</p>
        </div>
      </header>
      <VirtualTour content={{ ...tour, eyebrow: null, heading: null, sub: null }} full />
      <DealerBanner />
    </main>
  )
}
