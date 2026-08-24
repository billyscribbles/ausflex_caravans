import SEO from '../lib/seo.jsx'
import VirtualTour from '../components/VirtualTour.jsx'
import VideoEmbed from '../components/VideoEmbed.jsx'
import DealerBanner from '../components/DealerBanner.jsx'
import { tour } from '../content/tour.js'
import { useTours } from '../lib/contentStore.js'
import './TourPage.css'

export default function TourPage() {
  const { tours } = useTours()

  return (
    <main>
      <SEO
        title="360° Virtual Tour"
        description="Walk through our Australian-built caravans in full 360° — lounge, kitchen and bedrooms, exactly as they leave the Campbellfield factory — then watch an owner tour their own Ausflex."
        path="/360"
      />
      <header className="page-hero">
        <div className="container">
          <span className="section-eyebrow">{tour.page.eyebrow}</span>
          <h1 className="page-hero__title">{tour.page.heading}</h1>
          <p className="page-hero__sub">{tour.page.sub}</p>
        </div>
      </header>
      {/* One section per tour. The band copy is not passed through — each
       * section carries its own head, and the page hero above says the rest. */}
      <VirtualTour tours={tours} full />
      {/* The 360 collections are ours; this one is an owner's. It closes the
       * page on the same stage the home walkthrough uses. */}
      <VideoEmbed content={tour.video} className="tour-page__video" id="owner-walkthrough" />
      <DealerBanner />
    </main>
  )
}
