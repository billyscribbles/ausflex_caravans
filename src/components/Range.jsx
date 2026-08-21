import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { vans } from '../content/vans.js'
import { useScrollIn } from '../lib/motion.js'
import './Range.css'

// Photo cards for the van range. Pass `limit` to show a subset (home page)
// or leave it off for the full range (Our Vans page).
export default function Range({ limit }) {
  const scrollIn = useScrollIn()
  const items = limit ? vans.items.slice(0, limit) : vans.items

  return (
    <section className="range section" id="range">
      <div className="container">
        <div className="range__head">
          {vans.eyebrow && <span className="section-eyebrow">{vans.eyebrow}</span>}
          <h2 className="section-label">{vans.heading}</h2>
          {vans.sub && <p className="section-sub">{vans.sub}</p>}
        </div>

        <div className="range__grid">
          {items.map((van, i) => (
            <motion.article key={van.slug} className="range__card" {...scrollIn(i)}>
              <Link to={`/vans/${van.slug}`} className="range__card-link">
                <div className="range__image">
                  <img src={van.image} alt={van.imageAlt} loading="lazy" />
                </div>
                <div className="range__body">
                  <span className="range__tag">
                    {van.length} · {van.tag}
                  </span>
                  <h3 className="range__name">{van.name}</h3>
                  <p className="range__blurb">{van.blurb}</p>
                  <span className="range__more">View details →</span>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
