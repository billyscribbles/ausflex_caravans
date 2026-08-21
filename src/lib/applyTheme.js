import { theme } from '../config/theme.config.js'

// Flattens theme.config into CSS custom properties on :root.
// Called once from main.jsx before React mounts, so every CSS file can
// keep using var(--color-accent) etc. without knowing about the config.
export function applyTheme() {
  const root = document.documentElement
  const set = (prefix, obj) => {
    for (const [key, value] of Object.entries(obj)) {
      root.style.setProperty(`--${prefix}-${key}`, value)
    }
  }
  set('color', theme.colors)
  set('font', theme.fonts)
  set('radius', theme.radii)
  set('shadow', theme.shadows)
  set('transition', theme.transitions)
}
