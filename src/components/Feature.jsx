import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { feature } from '../content/feature.js'
import { useScrollIn } from '../lib/motion.js'
import './Feature.css'

// Technical showcase — full-height chassis photo one side, large numbered
// features the other, on charcoal. The numerals and rules carry the weight
// here; the copy per row stays to two lines.
export default function Feature() {
  const scrollIn = useScrollIn()
  return (
    <section className="feature section section--dark section--charcoal" id="craft">
      <div className="container">
        <div className="feature__head">
          <span className="ghost-word" aria-hidden="true">
            Chassis
          </span>
          <div className="feature__head-main">
            {feature.eyebrow && <span className="section-eyebrow">{feature.eyebrow}</span>}
            <h2 className="section-label feature__heading">{feature.heading}</h2>
          </div>
          <div className="feature__head-aside">
            {feature.body && <p className="feature__intro">{feature.body}</p>}
            {feature.techLine && <p className="feature__tech">{feature.techLine}</p>}
          </div>
        </div>

        <div className="feature__grid">
          <div className="feature__media">
            <div className="feature__image">
              <img src={feature.image} alt={feature.imageAlt} loading="lazy" />
            </div>
          </div>

          <motion.div className="feature__rows" {...scrollIn(0)}>
            {feature.points.map((p, i) => (
              <div key={p.title} className="feature__row">
                <span className="numeral feature__row-no" aria-hidden="true">
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
