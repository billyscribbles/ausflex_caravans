import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { feature } from '../content/feature.js'
import { useScrollIn } from '../lib/motion.js'
import './Feature.css'

// Split image/copy feature band — image one side, copy the other.
export default function Feature() {
  const scrollIn = useScrollIn()
  return (
    <section className="feature">
      <div className="feature__image">
        <img src={feature.image} alt={feature.imageAlt} loading="lazy" />
      </div>
      <motion.div className="feature__copy" {...scrollIn(0)}>
        <div className="feature__copy-inner">
          {feature.eyebrow && <span className="section-eyebrow">{feature.eyebrow}</span>}
          <h2 className="section-label">{feature.heading}</h2>
          <p className="feature__body">{feature.body}</p>

          {feature.points?.length > 0 && (
            <dl className="feature__points">
              {feature.points.map((p) => (
                <div key={p.title} className="feature__point">
                  <dt>{p.title}</dt>
                  <dd>{p.detail}</dd>
                </div>
              ))}
            </dl>
          )}

          {feature.cta && (
            <Link to={feature.cta.to} className="feature__cta">
              {feature.cta.label} →
            </Link>
          )}
        </div>
      </motion.div>
    </section>
  )
}
