import SEO from '../lib/seo.jsx'
import GalleryGrid from '../components/GalleryGrid.jsx'
import DealerBanner from '../components/DealerBanner.jsx'
import { gallery } from '../content/gallery.js'
import { useCollection } from '../lib/contentStore.js'

export default function GalleryPage() {
  const page = useCollection('page')
  const exteriors = useCollection('exteriors')

  return (
    <main>
      <SEO
        title="Gallery"
        description="The features, interiors and exteriors of our Australian-built caravans, straight from the Campbellfield factory floor and the road."
        path="/gallery"
      />
      <header className="page-hero">
        <div className="container">
          <span className="section-eyebrow">{gallery.page.eyebrow}</span>
          <h1 className="page-hero__title">{gallery.page.heading}</h1>
          <p className="page-hero__sub">{gallery.page.sub}</p>
        </div>
      </header>
      {/* The exteriors collection is managed in the dashboard but had no
          surface until now; it sits above the mosaic rather than on the home
          page, which leaves the home band's tuned rhythm alone. */}
      <GalleryGrid
        content={{ ...gallery.exteriors, items: exteriors.items }}
        loading={exteriors.loading}
        dark
        id="exteriors"
      />
      <GalleryGrid
        content={{ ...gallery.page, eyebrow: null, heading: null, sub: null, items: page.items }}
        loading={page.loading}
        lightbox
      />
      <DealerBanner />
    </main>
  )
}
