import { useReducedMotion } from 'framer-motion'

const ENTER = { opacity: 0, y: 24 }
const VISIBLE = { opacity: 1, y: 0 }

// Scroll-in animation for section grids. Call once per component; the returned
// function builds per-item props, staggered by index. When the user prefers
// reduced motion it yields inert props, so the markup stays identical either
// way and no component needs its own reduced-motion branch.
export function useScrollIn() {
  const reduce = useReducedMotion()
  return function scrollIn(index = 0) {
    if (reduce) return { initial: false }
    return {
      initial: ENTER,
      whileInView: VISIBLE,
      viewport: { once: true },
      transition: { duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] },
    }
  }
}
