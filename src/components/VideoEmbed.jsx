import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import { video } from '../content/video.js'
import { useScrollIn } from '../lib/motion.js'
import './VideoEmbed.css'

// Cinematic walkthrough band. The stage sits on the container grid at 21:9 —
// the letterbox is what carries the cinema, not the width, so it stays inside
// the same left and right anchors as every other band. The model plate is laid
// over it and the copy above is one line, so the frame carries the section. A
// thumbnail facade stands in until the visitor presses play, so the page stays
// light.
//
// `content` is the band's own block so the same stage can carry a different
// film on another page — /why-ausflex passes the Tough Test segment. The plate
// and the closing link are both optional: a block with no `model` or `cta`
// renders as the frame alone.
export default function VideoEmbed({ content = video, className = '', id = 'video' }) {
  const scrollIn = useScrollIn()
  const [playing, setPlaying] = useState(false)

  return (
    <section className={`video section section--dark${className ? ` ${className}` : ''}`} id={id}>
      <div className="container video__head">
        {content.eyebrow && <span className="section-eyebrow">{content.eyebrow}</span>}
        <h2 className="display-statement video__heading">
          {content.heading} <em>{content.headingAccent}</em>
        </h2>
        {content.sub && <p className="video__sub">{content.sub}</p>}
      </div>

      <div className="container">
        <motion.div className="video__stage" {...scrollIn(0)}>
          <div className="video__frame">
            {playing ? (
              <iframe
                className="video__player"
                src={`https://www.youtube-nocookie.com/embed/${content.youtubeId}?autoplay=1&rel=0`}
                title={content.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                className="video__poster"
                aria-label={`Play video: ${content.title}`}
                onClick={() => setPlaying(true)}
                style={content.posterScale ? { '--poster-scale': content.posterScale } : undefined}
              >
                <img
                  src={`https://i.ytimg.com/vi/${content.youtubeId}/maxresdefault.jpg`}
                  alt=""
                  loading="lazy"
                />
                <span className="video__scrim" aria-hidden="true" />
                <span className="video__play" aria-hidden="true">
                  <Play size={26} strokeWidth={1.5} fill="currentColor" />
                </span>
              </button>
            )}
          </div>

          {/* Sits over the frame but outside the button, so the spec plate is
           * read as content rather than folded into the play label. */}
          {!playing && content.model && (
            <div className="video__plate">
              <span className="metaline video__plate-model">{content.model}</span>
              <dl className="video__specs">
                {content.specs.map((s) => (
                  <div key={s.label} className="video__spec">
                    <dt>{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </motion.div>
      </div>

      {content.cta && (
        <div className="container">
          {/* The rule lives on this inner row, not on the container: a
           * border on the padded wrapper would start a gutter's width left
           * of every other element on the page. */}
          <div className="video__foot">
            <Link to={content.cta.to} className="video__cta">
              {content.cta.label} →
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
