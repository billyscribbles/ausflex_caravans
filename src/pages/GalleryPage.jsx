import SEO from '../lib/seo.jsx'
import GalleryGrid from '../components/GalleryGrid.jsx'
import DealerBanner from '../components/DealerBanner.jsx'
import { gallery } from '../content/gallery.js'

export default function GalleryPage() {
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
      <GalleryGrid
        content={{ ...gallery.page, eyebrow: null, heading: null, sub: null }}
        lightbox
      />
      <DealerBanner />
    </main>
  )
}
