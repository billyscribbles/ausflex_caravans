import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useScrollIn } from '../lib/motion.js'
import './GalleryGrid.css'

// Reusable photo mosaic. `content` is { eyebrow, heading, sub, items }.
// `dark` renders on the charcoal band; `lightbox` makes tiles click-to-enlarge.
export default function GalleryGrid({ content, dark = false, lightbox = false, id }) {
  const scrollIn = useScrollIn()
  const [active, setActive] = useState(null)
  const lastTrigger = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (active === null) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setActive(null)
    }
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [active])

  useEffect(() => {
    if (active === null) lastTrigger.current?.focus()
  }, [active])

  const item = active !== null ? content.items[active] : null

  return (
    <section className={`gallery-grid section${dark ? ' section--dark' : ''}`} id={id}>
      <div className="container">
        <div className="gallery-grid__head">
          {content.eyebrow && <span className="section-eyebrow">{content.eyebrow}</span>}
          <h2 className="section-label">{content.heading}</h2>
          {content.sub && <p className="section-sub">{content.sub}</p>}
        </div>

        <div className="gallery-grid__mosaic">
          {content.items.map((photo, i) => {
            const media = (
              <>
                <img src={photo.src} alt={lightbox ? '' : photo.alt} loading="lazy" />
                {photo.caption && (
                  <span className="gallery-grid__caption">{photo.caption}</span>
                )}
              </>
            )
            return (
              <motion.figure key={photo.src} className="gallery-grid__tile" {...scrollIn(i % 6)}>
                {lightbox ? (
                  <button
                    type="button"
                    className="gallery-grid__zoom"
                    aria-label={`Enlarge photo: ${photo.alt}`}
                    onClick={(e) => {
                      lastTrigger.current = e.currentTarget
                      setActive(i)
                    }}
                  >
                    {media}
                  </button>
                ) : (
                  media
                )}
              </motion.figure>
            )
          })}
        </div>
      </div>

      {item && (
        /* Backdrop click-to-close duplicates the visible close button. */
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
        <div
          className="gallery-grid__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={item.alt}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActive(null)
          }}
        >
          <button
            type="button"
            ref={closeRef}
            className="gallery-grid__close"
            aria-label="Close photo"
            onClick={() => setActive(null)}
          >
            <X size={22} strokeWidth={2} />
          </button>
          <img src={item.src} alt={item.alt} />
        </div>
      )}
    </section>
  )
}
