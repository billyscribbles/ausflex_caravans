import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Rotate3d } from 'lucide-react'
import { tour } from '../content/tour.js'
import { useScrollIn } from '../lib/motion.js'
import './VirtualTour.css'

// Kuula 360° tour band. On the home page the copy sits in a controlled ink
// plate in a narrow column and the interior takes the rest of the grid — the
// photo is the dominant half, but the two stay side by side rather than the
// plate lapping over it. Kuula only mounts once the visitor launches it, so
// the page stays light.
//
// The /360 page passes `full` to drop the copy column and load the tour
// immediately at full container width.
//
// `tours` is the managed list from the admin dashboard. The full page renders a
// picker across it; the home band shows the first one. Either way exactly one
// iframe is mounted — several Kuula players at once would be punishing.
export default function VirtualTour({ content = tour, tours = [], full = false }) {
  const scrollIn = useScrollIn()
  const [active, setActive] = useState(full)
  const [index, setIndex] = useState(0)

  // Falls back to the static content file's single tour before live data lands.
  const list = tours.length
    ? tours
    : [{ id: 'static', title: content.title, embedUrl: content.src, poster: content.poster }]
  const current = list[Math.min(index, list.length - 1)]
  const showPicker = full && list.length > 1

  return (
    <section className={`tour section${full ? '' : ' tour--band'}`} id="tour">
      <div className={`container${full ? '' : ' tour__layout'}`}>
        {/* Outside the frame: the frame is a fixed-height, overflow-hidden
         * box, so a picker in flow inside it pushed the player under its own
         * bottom edge. */}
        {showPicker && (
          <div className="tour__picker" role="group" aria-label="Choose a tour">
            {list.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={`tour__pick${i === index ? ' tour__pick--active' : ''}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => setIndex(i)}
              >
                {item.title}
              </button>
            ))}
          </div>
        )}

        {content.heading && !full && (
          <div className="tour__copy">
            {content.eyebrow && <span className="section-eyebrow">{content.eyebrow}</span>}
            <h2 className="section-label tour__heading">{content.heading}</h2>
            {content.sub && <p className="tour__sub">{content.sub}</p>}
            {content.cta && (
              <Link to={content.cta.to} className="tour__cta">
                {content.cta.label} →
              </Link>
            )}
          </div>
        )}

        <motion.div className={`tour__frame${full ? ' tour__frame--full' : ''}`} {...scrollIn(0)}>
          {active ? (
            <iframe
              key={current.id}
              className="tour__player"
              src={current.embedUrl}
              title={current.title}
              allow="xr-spatial-tracking; gyroscope; accelerometer"
              allowFullScreen
            />
          ) : (
            <button type="button" className="tour__poster" onClick={() => setActive(true)}>
              <img src={current.poster} alt="" loading="lazy" />
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
