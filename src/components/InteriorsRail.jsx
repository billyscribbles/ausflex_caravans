import { motion } from 'framer-motion'
import { useScrollIn } from '../lib/motion.js'
import './InteriorsRail.css'

// Horizontal photo rail. `content` is { eyebrow, heading, sub, items } —
// the same shape GalleryGrid reads, so collections are interchangeable.
export default function InteriorsRail({ content, id }) {
  const scrollIn = useScrollIn()

  return (
    <section className="interiors-rail section" id={id}>
      <div className="container interiors-rail__head">
        <div>
          {content.eyebrow && <span className="section-eyebrow">{content.eyebrow}</span>}
          <h2 className="section-label interiors-rail__heading">{content.heading}</h2>
        </div>
        <span className="interiors-rail__hint" aria-hidden="true">
          Scroll →
        </span>
      </div>

      {/* Focusable so keyboard users can arrow through the overflow. */}
      <div
        className="interiors-rail__track"
        role="region"
        aria-label={content.heading}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
      >
        {content.items.map((photo, i) => (
          <motion.figure key={photo.src} className="interiors-rail__card" {...scrollIn(i % 3)}>
            <div className="interiors-rail__frame">
              <img src={photo.src} alt={photo.alt} loading="lazy" />
            </div>
            {photo.caption && (
              <figcaption className="interiors-rail__caption">{photo.caption}</figcaption>
            )}
          </motion.figure>
        ))}
      </div>
    </section>
  )
}
