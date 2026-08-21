import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { dealer } from '../content/dealer.js'
import { useScrollIn } from '../lib/motion.js'
import './DealerBanner.css'

// Dark band: the brand quote up top, dealer-network pitch + CTA below.
export default function DealerBanner() {
  const scrollIn = useScrollIn()
  return (
    <section className="dealer section section--dark">
      <div className="container">
        {dealer.quote && (
          <motion.blockquote className="dealer__quote" {...scrollIn(0)}>
            “{dealer.quote}”
          </motion.blockquote>
        )}
        <motion.div className="dealer__row" {...scrollIn(1)}>
          <div className="dealer__copy">
            {dealer.eyebrow && <span className="section-eyebrow">{dealer.eyebrow}</span>}
            <h2 className="dealer__heading">{dealer.heading}</h2>
            <p className="dealer__body">{dealer.body}</p>
          </div>
          {dealer.cta && (
            <Link to={dealer.cta.to} className="dealer__cta">
              {dealer.cta.label}
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  )
}
