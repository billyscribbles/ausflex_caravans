import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { vans } from '../content/vans.js'
import { useScrollIn } from '../lib/motion.js'
import './Range.css'

// Editorial cards for the van range. Pass `limit` to show a subset, or
// `showHead={false}` when the page above already introduces the range.
export default function Range({ limit, showHead = true }) {
  const scrollIn = useScrollIn()
  const items = limit ? vans.items.slice(0, limit) : vans.items

  return (
    <section className="range section" id="range">
      <div className="container">
        {showHead && (
          <div className="range__head">
            <div className="range__head-main">
              {vans.eyebrow && <span className="section-eyebrow">{vans.eyebrow}</span>}
              <h2 className="section-label range__heading">{vans.heading}</h2>
            </div>
            {vans.sub && <p className="range__sub">{vans.sub}</p>}
          </div>
        )}

        <div className="range__grid">
          {items.map((van, i) => (
            <motion.article key={van.slug} className="range__card" {...scrollIn(i % 3)}>
              <Link to={`/vans/${van.slug}`} className="range__card-link">
                <div className="range__image">
                  <img src={van.image} alt={van.imageAlt} loading="lazy" />
                  <span className="range__index" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="range__title-row">
                  <h3 className="range__name">{van.name}</h3>
                  <span className="range__length">{van.length}</span>
                </div>
                <p className="range__meta">{van.meta || van.tag}</p>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
