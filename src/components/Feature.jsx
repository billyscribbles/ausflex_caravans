import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { feature } from '../content/feature.js'
import { useScrollIn } from '../lib/motion.js'
import './Feature.css'

// Craft band — factory image one side, numbered engineering rows the other.
export default function Feature() {
  const scrollIn = useScrollIn()
  return (
    <section className="feature section" id="craft">
      <div className="container">
        {feature.eyebrow && <span className="section-eyebrow">{feature.eyebrow}</span>}
        <h2 className="section-label feature__heading">{feature.heading}</h2>

        <div className="feature__grid">
          <div className="feature__image">
            <img src={feature.image} alt={feature.imageAlt} loading="lazy" />
          </div>

          <motion.div className="feature__rows" {...scrollIn(0)}>
            {feature.body && <p className="feature__body">{feature.body}</p>}

            {feature.points.map((p, i) => (
              <div key={p.title} className="feature__row">
                <span className="feature__row-no" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="feature__row-title">{p.title}</h3>
                  <p className="feature__row-body">{p.detail}</p>
                </div>
              </div>
            ))}

            {feature.cta && (
              <Link to={feature.cta.to} className="feature__cta">
                {feature.cta.label} →
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
