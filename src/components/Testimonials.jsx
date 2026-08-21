import { motion } from 'framer-motion'
import { testimonials } from '../content/testimonials.js'
import { useScrollIn } from '../lib/motion.js'
import './Testimonials.css'

export default function Testimonials() {
  const scrollIn = useScrollIn()
  return (
    <section className="testimonials section">
      <div className="container">
        <div className="testimonials__head">
          {testimonials.eyebrow && <span className="section-eyebrow">{testimonials.eyebrow}</span>}
          <h2 className="section-label">{testimonials.heading}</h2>
        </div>

        <div className="testimonials__grid">
          {testimonials.items.map((t, i) => (
            <motion.figure key={t.quote} className="testimonials__card" {...scrollIn(i)}>
              {/* Typographic quotes, not the straight ASCII pair. */}
              <blockquote className="testimonials__quote">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="testimonials__author">
                <div className="testimonials__author-name">{t.author}</div>
                <div className="testimonials__author-role">{t.role}</div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
