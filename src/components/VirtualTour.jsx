import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Rotate3d } from 'lucide-react'
import { tour } from '../content/tour.js'
import { useScrollIn } from '../lib/motion.js'
import './VirtualTour.css'

// Kuula 360° tour band. The home page sets the copy in a narrow column with
// the player wide beside it, and only mounts Kuula once the visitor launches
// it, so the page stays light. The /360 page passes `full` to drop the copy
// column and load the tour immediately at full container width.
export default function VirtualTour({ content = tour, full = false }) {
  const scrollIn = useScrollIn()
  const [active, setActive] = useState(full)

  return (
    <section className="tour section" id="tour">
      <div className="container">
        <div className={`tour__grid${full ? ' tour__grid--full' : ''}`}>
          {content.heading && (
            <div className="tour__copy">
              {content.eyebrow && <span className="section-eyebrow">{content.eyebrow}</span>}
              <h2 className="section-label tour__heading">{content.heading}</h2>
              {content.sub && <p className="section-sub tour__sub">{content.sub}</p>}
            </div>
          )}

          <motion.div className={`tour__frame${full ? ' tour__frame--full' : ''}`} {...scrollIn(0)}>
            {active ? (
              <iframe
                className="tour__player"
                src={content.src}
                title={content.title}
                allow="xr-spatial-tracking; gyroscope; accelerometer"
                allowFullScreen
              />
            ) : (
              <button type="button" className="tour__poster" onClick={() => setActive(true)}>
                <img src={content.poster} alt="" loading="lazy" />
                <span className="tour__launch">
                  <Rotate3d size={18} strokeWidth={1.5} aria-hidden="true" />
                  {content.launchLabel}
                </span>
              </button>
            )}
          </motion.div>

          {content.heading && content.cta && (
            <div className="tour__cta-row">
              <Link to={content.cta.to} className="tour__cta">
                {content.cta.label} →
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
