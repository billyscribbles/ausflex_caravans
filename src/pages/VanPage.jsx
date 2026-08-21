import { Link, useParams } from 'react-router-dom'
import SEO from '../lib/seo.jsx'
import ContactCTA from '../components/ContactCTA.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import { vans } from '../content/vans.js'
import './VanPage.css'

export default function VanPage() {
  const { slug } = useParams()
  const van = vans.items.find((v) => v.slug === slug)

  if (!van) return <NotFoundPage />

  return (
    <main className="van">
      <SEO
        title={`${van.length} ${van.name}`}
        description={van.blurb}
        image={van.image}
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
            <img src={van.image} alt={van.imageAlt} fetchpriority="high" />
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
            {van.description.map((p) => (
              <p key={p} className="van__paragraph">
                {p}
              </p>
            ))}
            <Link to="/contact" className="van__enquire">
              Enquire about the {van.name}
            </Link>
          </div>

          {van.floorplan && (
            <figure className="van__floorplan">
              <img src={van.floorplan} alt={van.floorplanAlt} loading="lazy" />
              <figcaption>
                Floor plan · {van.length} {van.name}. Layouts are made to order and can be
                customised.
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
                <figure key={photo.src} className="van__photo">
                  <img src={photo.src} alt={photo.alt} loading="lazy" />
                  {photo.caption && <figcaption>{photo.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <ContactCTA />
    </main>
  )
}
