import { motion } from 'framer-motion'
import { useScrollIn } from '../lib/motion.js'
import './InteriorsRail.css'

// Campaign layout for a photo collection. `content` is
// { eyebrow, heading, headingAccent, sub, items } — the same shape GalleryGrid
// reads, so collections are interchangeable.
//
// The first three photos run as a mosaic: one dominant lead shot beside two
// supporting crops at different aspects. Everything after them continues in the
// horizontal rail below, which is where a live collection's long tail goes.
const SKELETON_CARDS = 6

export default function InteriorsRail({ content, loading = false, id }) {
  const scrollIn = useScrollIn()
  const items = content.items ?? []
  const [lead, ...rest] = items
  const supporting = rest.slice(0, 2)
  const railItems = rest.slice(2)

  return (
    <section className="interiors section" id={id}>
      <div className="container interiors__head">
        <span className="ghost-word" aria-hidden="true">
          Inside
        </span>
        <div className="interiors__head-main">
          {content.eyebrow && <span className="section-eyebrow">{content.eyebrow}</span>}
          <h2 className="display-statement interiors__heading">
            {content.heading} {content.headingAccent && <em>{content.headingAccent}</em>}
          </h2>
        </div>
        {content.sub && <p className="interiors__sub">{content.sub}</p>}
      </div>

      {!loading && lead && (
        <div className="container interiors__mosaic">
          <motion.figure className="interiors__lead" {...scrollIn(0)}>
            <div className="interiors__frame">
              <img src={lead.src} alt={lead.alt} loading="lazy" />
            </div>
            {lead.caption && (
              <figcaption className="metaline interiors__caption">{lead.caption}</figcaption>
            )}
          </motion.figure>

          {supporting.map((photo, i) => (
            <motion.figure
              key={photo.id ?? photo.src}
              className={`interiors__support interiors__support--${i + 1}`}
              {...scrollIn(i + 1)}
            >
              <div className="interiors__frame">
                <img src={photo.src} alt={photo.alt} loading="lazy" />
              </div>
              {photo.caption && (
                <figcaption className="metaline interiors__caption">{photo.caption}</figcaption>
              )}
            </motion.figure>
          ))}
        </div>
      )}

      {/* Focusable so keyboard users can arrow through the overflow. */}
      {(loading || railItems.length > 0) && (
        <div
          className="interiors-rail__track"
          role="region"
          aria-label={content.heading}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
        >
          {loading &&
            Array.from({ length: SKELETON_CARDS }, (_, i) => (
              <div
                key={`skeleton-${i}`}
                className="interiors-rail__card interiors-rail__card--skeleton"
              />
            ))}
          {!loading &&
            railItems.map((photo, i) => (
              <motion.figure
                key={photo.id ?? photo.src}
                className="interiors-rail__card"
                {...scrollIn(i % 3)}
              >
                <div className="interiors-rail__frame">
                  <img src={photo.src} alt={photo.alt} loading="lazy" />
                </div>
                {photo.caption && (
                  <figcaption className="metaline interiors-rail__caption">
                    {photo.caption}
                  </figcaption>
                )}
              </motion.figure>
            ))}
        </div>
      )}
    </section>
  )
}
