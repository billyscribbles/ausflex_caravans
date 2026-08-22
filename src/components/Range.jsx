import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useVans } from '../lib/contentStore.js'
import { useScrollIn } from '../lib/motion.js'
import './Range.css'

// Editorial cards for the van range — two to a row, brochure scale. Pass
// `limit` to show a subset, or `showHead={false}` when the page above already
// introduces the range.
export default function Range({ limit, showHead = true }) {
  const scrollIn = useScrollIn()
  const { vans } = useVans()
  const items = limit ? vans.items.slice(0, limit) : vans.items

  return (
    <section className="range section" id="range">
      <div className="container">
        {showHead && (
          <div className="range__head">
            <span className="ghost-word" aria-hidden="true">
              Range
            </span>
            <div className="range__head-main">
              {vans.eyebrow && <span className="section-eyebrow">{vans.eyebrow}</span>}
              <h2 className="section-label range__heading">{vans.heading}</h2>
            </div>
            {vans.sub && <p className="range__sub">{vans.sub}</p>}
          </div>
        )}

        <div className="range__grid">
          {items.map((van, i) => (
            <motion.article key={van.id ?? van.slug} className="range__card" {...scrollIn(i % 2)}>
              <Link to={`/vans/${van.slug}`} className="range__card-link">
                <div className="range__image">
                  {van.image && <img src={van.image} alt={van.imageAlt} loading="lazy" />}
                </div>

                <div className="range__body">
                  <span className="numeral range__index" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <div className="range__text">
                    <span className="metaline range__tag">{van.tag}</span>
                    <div className="range__title-row">
                      <h3 className="range__name">{van.name}</h3>
                      <span className="range__length">{van.length}</span>
                    </div>
                    <p className="range__meta">{van.meta || van.tag}</p>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
