import { Link } from 'react-router-dom'
import SEO from '../lib/seo.jsx'
import Stats from '../components/Stats.jsx'
import Testimonials from '../components/Testimonials.jsx'
import Contact from '../components/Contact.jsx'
import { about } from '../content/about.js'
import './AboutPage.css'

export default function AboutPage() {
  return (
    <main>
      <SEO
        title="About Us"
        description="Ausflex Caravans is Victoria's boutique caravan manufacturer, producing vans for some of Australia's most prestigious brands and building our own since 1972."
        path="/about"
      />

      <header className="page-hero">
        <div className="container">
          <span className="section-eyebrow">{about.eyebrow}</span>
          <h1 className="page-hero__title">{about.heading}</h1>
          <p className="page-hero__sub">{about.intro}</p>
        </div>
      </header>

      <section className="about section">
        <div className="container about__grid">
          <div className="about__copy">
            {about.body.map((p) => (
              <p key={p} className="about__paragraph">
                {p}
              </p>
            ))}
            <p className="about__highlight">{about.highlight}</p>
            {about.cta && (
              <Link to={about.cta.to} className="about__cta">
                {about.cta.label} →
              </Link>
            )}
          </div>
          <figure className="about__image">
            <img src={about.image} alt={about.imageAlt} loading="lazy" />
          </figure>
        </div>
      </section>

      <Stats />
      <Testimonials />
      <Contact />
    </main>
  )
}
