import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import { video } from '../content/video.js'
import { useScrollIn } from '../lib/motion.js'
import './VideoEmbed.css'

// YouTube walkthrough band. Shows a thumbnail facade and only loads the
// player once the visitor presses play, so the page stays light.
// Desktop runs the player wide on the left with the copy set beside it;
// below 1024px it stacks copy-first.
export default function VideoEmbed() {
  const scrollIn = useScrollIn()
  const [playing, setPlaying] = useState(false)

  return (
    <section className="video section section--dark" id="video">
      <div className="container">
        <div className="video__grid">
          <div className="video__copy">
            {video.eyebrow && <span className="section-eyebrow">{video.eyebrow}</span>}
            <h2 className="section-label video__heading">{video.heading}</h2>
            {video.sub && <p className="section-sub video__sub">{video.sub}</p>}
          </div>

          <motion.div className="video__frame" {...scrollIn(0)}>
            {playing ? (
              <iframe
                className="video__player"
                src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                className="video__poster"
                aria-label={`Play video: ${video.title}`}
                onClick={() => setPlaying(true)}
              >
                <img
                  src={`https://i.ytimg.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                  alt=""
                  loading="lazy"
                />
                <span className="video__play" aria-hidden="true">
                  <Play size={26} strokeWidth={1.5} fill="currentColor" />
                </span>
              </button>
            )}
          </motion.div>

          {video.cta && (
            <div className="video__cta-row">
              <Link to={video.cta.to} className="video__cta">
                {video.cta.label} →
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
