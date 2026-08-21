import { useState } from 'react'
import { motion } from 'framer-motion'
import { Rotate3d } from 'lucide-react'
import { tour } from '../content/tour.js'
import { useScrollIn } from '../lib/motion.js'
import './VirtualTour.css'

// Kuula 360° tour band. The home page shows a poster facade and only mounts
// the Kuula player once the visitor launches it, so the page stays light.
// The /360 page passes `full` to load the tour immediately at full width.
export default function VirtualTour({ content = tour, full = false }) {
  const scrollIn = useScrollIn()
  const [active, setActive] = useState(full)

  return (
    <section className="tour section" id="tour">
      <div className="container">
        {content.heading && (
          <div className="tour__head">
            {content.eyebrow && <span className="section-eyebrow">{content.eyebrow}</span>}
            <h2 className="section-label">{content.heading}</h2>
            {content.sub && <p className="section-sub">{content.sub}</p>}
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
      </div>
    </section>
  )
}
