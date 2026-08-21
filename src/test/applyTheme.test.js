// Contract: applyTheme() flattens every theme.config token into a CSS
// custom property on :root. If this breaks, a brand's theme swap silently
// stops reaching the stylesheet — so every token is asserted individually.
import { describe, it, expect, beforeAll } from 'vitest'
import { applyTheme } from '../lib/applyTheme.js'
import { theme } from '../config/theme.config.js'

const groups = {
  color: theme.colors,
  font: theme.fonts,
  radius: theme.radii,
  shadow: theme.shadows,
  transition: theme.transitions,
}

describe('applyTheme — theme.config → CSS custom properties', () => {
  beforeAll(() => applyTheme())

  const root = () => document.documentElement

  for (const [prefix, tokens] of Object.entries(groups)) {
    for (const [key, value] of Object.entries(tokens)) {
      it(`writes --${prefix}-${key} onto :root`, () => {
        expect(root().style.getPropertyValue(`--${prefix}-${key}`)).toBe(value)
      })
    }
  }
})
