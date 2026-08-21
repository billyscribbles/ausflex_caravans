import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { faq } from '../content/faq.js'
import './FAQ.css'

export default function FAQ() {
  const [open, setOpen] = useState(null)
  const reduce = useReducedMotion()

  return (
    <section className="faq section">
      <div className="container faq__inner">
        <div className="faq__head">
          {faq.eyebrow && <span className="section-eyebrow">{faq.eyebrow}</span>}
          <h2 className="section-label">{faq.heading}</h2>
        </div>

        <ul className="faq__list">
          {faq.items.map((item, i) => {
            const isOpen = open === i
            return (
              <li key={item.q} className={`faq__item${isOpen ? ' open' : ''}`}>
                <button
                  className="faq__question"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <Plus
                    className="faq__icon"
                    size={20}
                    strokeWidth={2}
                    style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0)' }}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      className="faq__answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="faq__answer-inner">{item.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
