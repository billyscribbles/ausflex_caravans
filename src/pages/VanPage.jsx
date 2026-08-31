import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SEO from '../lib/seo.jsx'
import ContactCTA from '../components/ContactCTA.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import { useVans } from '../lib/contentStore.js'
import './VanPage.css'

export default function VanPage() {
  const { slug } = useParams()
  const { vans, loading } = useVans()
  const van = vans.items.find((v) => v.slug === slug)

  // A van added in the dashboard is not in the static fallback, so a direct
  // load would flash NotFoundPage for one frame before the fetch lands. Hold
  // until the range is actually known.
  if (!van && loading) {
    return (
      <main className="van">
        <p className="van__loading" role="status">
          Loading…
        </p>
      </main>
    )
  }

  if (!van) return <NotFoundPage />

  return (
    <main className="van">
      <SEO
        title={`${van.length} ${van.name}`.trim()}
        description={van.blurb}
        image={van.image ?? undefined}
        path={`/vans/${van.slug}`}
      />

      <header className="page-hero van__hero">
        <div className="container">
          <nav className="van__breadcrumb" aria-label="Breadcrumb">
            <Link to="/vans">Our Vans</Link>
            <span aria-hidden="true"> / </span>
            <span aria-current="page">{van.name}</span>
          </nav>
          <span className="section-eyebrow">
            {van.length} · {van.tag}
          </span>
          <h1 className="page-hero__title">{van.name}</h1>
          <p className="page-hero__sub">{van.blurb}</p>
        </div>
      </header>

      <section className="van__showcase">
        <div className="container">
          <div className="van__main-image">
            {van.image && <img src={van.image} alt={van.imageAlt} fetchpriority="high" />}
          </div>
          {van.specs?.length > 0 && (
            <ul className="van__specs">
              {van.specs.map((s) => (
                <li key={s} className="van__spec">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="van__detail section">
        <div className="container van__detail-grid">
          <div className="van__copy">
            <h2 className="section-label">About this van.</h2>
            {(van.description ?? []).map((p) => (
              <p key={p} className="van__paragraph">
                {p}
              </p>
            ))}
            <Link to="/contact" className="van__enquire">
              Come and see the {van.name}
            </Link>
          </div>

          {van.floorplan && (
            <figure className="van__floorplan">
              <img src={van.floorplan} alt={van.floorplanAlt} loading="lazy" />
              <figcaption>
                Floor plan · {van.length} {van.name}. A starting point — change the layout, the
                fit-out and the finishes to suit you.
              </figcaption>
            </figure>
          )}
        </div>
      </section>

      {van.photos?.length > 0 && (
        <section className="van__photos section section--dark">
          <div className="container">
            <h2 className="section-label">In the flesh.</h2>
            <div className="van__photo-grid">
              {van.photos.map((photo) => (
                <VanPhoto key={photo.src} photo={photo} />
              ))}
            </div>
          </div>
        </section>
      )}

      <ContactCTA />
    </main>
  )
}

// The 3D layout renders are far wider than camera photos, and cover-cropping
// them into a grid tile reads as zoomed-in. Aspect is only knowable once the
// image loads (photos also arrive via the dashboard), so flag panoramas here
// and let the CSS show them whole.
function VanPhoto({ photo }) {
  const [wide, setWide] = useState(false)
  return (
    <figure className={wide ? 'van__photo van__photo--wide' : 'van__photo'}>
      <img
        src={photo.src}
        alt={photo.alt}
        loading="lazy"
        onLoad={(e) => {
          const { naturalWidth, naturalHeight } = e.currentTarget
          if (naturalWidth > naturalHeight * 1.9) setWide(true)
        }}
      />
      {photo.caption && <figcaption>{photo.caption}</figcaption>}
    </figure>
  )
}
