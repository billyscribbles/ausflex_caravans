import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import SEO from '../lib/seo.jsx'
import ContactCTA from '../components/ContactCTA.jsx'
import { why } from '../content/why.js'
import { useScrollIn } from '../lib/motion.js'
import './WhyPage.css'

export default function WhyPage() {
  const scrollIn = useScrollIn()
  return (
    <main>
      <SEO
        title="Why Ausflex"
        description="Manufacturing experience since 1972, an Australian-made heavy-duty chassis and a 5-year warranty. Why an Ausflex caravan is built to last."
        path="/why-ausflex"
      />

      <header className="page-hero">
        <div className="container">
          <span className="section-eyebrow">{why.eyebrow}</span>
          <h1 className="page-hero__title">{why.heading}</h1>
          <p className="page-hero__sub">{why.intro}</p>
        </div>
      </header>

      <section className="why__story section">
        <div className="container why__story-grid">
          <div>
            {why.body.map((p) => (
              <p key={p} className="why__paragraph">
                {p}
              </p>
            ))}
            <ul className="why__warranties">
              {why.warranties.map((w) => (
                <li key={w.item} className="why__warranty">
                  <span className="why__warranty-term">{w.term}</span>
                  <span className="why__warranty-item">{w.item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="why__specs-panel">
            <h2 className="why__specs-heading">{why.chassisHeading}</h2>
            <ul className="why__specs-list">
              {why.chassisSpecs.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="why__photos section section--dark">
        <div className="container">
          <span className="section-eyebrow">Under every Ausflex</span>
          <h2 className="section-label">The proof is in the steel.</h2>
          <div className="why__photo-grid">
            {why.images.map((img, i) => (
              <motion.figure key={img.src} className="why__photo" {...scrollIn(i)}>
                <img src={img.src} alt={img.alt} loading="lazy" />
              </motion.figure>
            ))}
          </div>
          <Link to={why.cta.to} className="why__cta">
            {why.cta.label}
          </Link>
        </div>
      </section>

      <ContactCTA />
    </main>
  )
}
