import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Rotate3d } from 'lucide-react'
import { tour } from '../content/tour.js'
import { useScrollIn } from '../lib/motion.js'
import './VirtualTour.css'

// Kuula 360° tour band, in two shapes.
//
// Home page: the copy sits in a controlled ink plate in a narrow column and
// the interior takes the rest of the grid — the photo is the dominant half,
// but the two stay side by side rather than the plate lapping over it. Kuula
// only mounts once the visitor launches it, so the page stays light. The band
// shows the first tour only.
//
// The /360 page passes `full`, and there every tour gets its own section, so
// the page reads as a list of vans you scroll rather than a tab strip. The
// first section loads its player straight away and the rest wait behind their
// poster; launching one hands the player over and the section that had it
// returns to its poster. Exactly one iframe is mounted either way — several
// Kuula players at once would be punishing.
//
// `tours` is the managed list from the admin dashboard.
export default function VirtualTour({ content = tour, tours = [], full = false }) {
  const scrollIn = useScrollIn()
  const [active, setActive] = useState(full)
  const [index, setIndex] = useState(0)

  // Falls back to the collections in the content file before live data lands,
  // so the sections are right on first paint rather than appearing later.
  const list = tours.length
    ? tours
    : (content.items ?? [content]).map((item, i) => ({
        id: `static-${i}`,
        title: item.title,
        embedUrl: item.src,
        poster: item.poster,
      }))

  const player = (item) => (
    <iframe
      key={item.id}
      className="tour__player"
      src={item.embedUrl}
      title={item.title}
      allow="xr-spatial-tracking; gyroscope; accelerometer"
      allowFullScreen
    />
  )

  if (full) {
    return list.map((item, i) => (
      <section
        key={item.id}
        className={`tour section tour--solo${i % 2 ? ' tour--solo-alt' : ''}`}
        id={`tour-${i + 1}`}
        aria-labelledby={`tour-heading-${i + 1}`}
      >
        <div className="container">
          <div className="tour__solo-head">
            {/* Counts the stack rather than repeating "360° virtual tour" down
             * the page — the page hero has already said that once. */}
            <span className="section-eyebrow">
              {String(i + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')}
            </span>
            <h2 id={`tour-heading-${i + 1}`} className="section-label tour__solo-heading">
              {item.title}
            </h2>
          </div>

          <motion.div className="tour__frame tour__frame--full" {...scrollIn(0)}>
            {i === index ? (
              player(item)
            ) : (
              <button
                type="button"
                className="tour__poster"
                // Every section carries the same launch copy, so the tour's own
                // name has to be in the accessible name or the button list is
                // a row of identical entries.
                aria-label={`${content.launchLabel}: ${item.title}`}
                onClick={() => setIndex(i)}
              >
                <img src={item.poster} alt="" loading="lazy" />
                <span className="tour__launch" aria-hidden="true">
                  <Rotate3d size={18} strokeWidth={1.5} />
                  {content.launchLabel}
                </span>
              </button>
            )}
          </motion.div>
        </div>
      </section>
    ))
  }

  const current = list[0]

  return (
    <section className="tour section tour--band" id="tour">
      <div className="container tour__layout">
        {content.heading && (
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

        <motion.div className="tour__frame" {...scrollIn(0)}>
          {active ? (
            player(current)
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
