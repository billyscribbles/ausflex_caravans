// Single source of truth for design tokens.
// Swap a brand's look by editing this file — applyTheme.js writes these
// onto :root as CSS custom properties at app boot.
//
// Ausflex: warm cream page, ink chrome, one bronze accent. Depth comes from
// hairline rules, not shadows — square corners everywhere except pills.

export const theme = {
  colors: {
    bg: '#faf8f5',
    'bg-alt': '#f1ede6',
    'bg-card': '#fffefb',
    text: '#171512',
    'text-soft': '#413d36',
    muted: '#6d675c',
    accent: '#b99a70',
    'accent-dark': '#82663c',
    'accent-light': '#ece1d0',
    'accent-glow': 'rgba(185, 154, 112, 0.16)',
    border: 'rgba(23, 21, 18, 0.1)',
    'border-strong': 'rgba(23, 21, 18, 0.2)',
    hairline: 'rgba(23, 21, 18, 0.08)',
    rule: 'rgba(23, 21, 18, 0.12)',
    dark: '#191713',
    'dark-deep': '#12100d',
    // Foreground set for the dark bands (nav, hero, process, footer).
    bone: '#F3EFE9',
    'bone-soft': 'rgba(243, 239, 233, 0.75)',
    'bone-muted': 'rgba(243, 239, 233, 0.55)',
    'bone-faint': 'rgba(243, 239, 233, 0.45)',
    'hairline-dark': 'rgba(243, 239, 233, 0.1)',
    'bronze-outline': 'rgba(201, 168, 124, 0.5)',
    // Form error state — AA on its own surface (8.26:1).
    danger: '#7d281e',
    'danger-surface': '#f7ece9',
    'danger-border': 'rgba(125, 40, 30, 0.28)',
    // Scrims over photography, all ramps of dark-deep so overlaid captions and
    // the hero stage share one black. -none is the transparent gradient end.
    'scrim-strong': 'rgba(18, 16, 13, 0.94)',
    scrim: 'rgba(18, 16, 13, 0.85)',
    'scrim-soft': 'rgba(18, 16, 13, 0.78)',
    'scrim-none': 'rgba(18, 16, 13, 0)',
  },
  fonts: {
    display: "'Archivo', 'Helvetica Neue', system-ui, sans-serif",
    body: "'Archivo', 'Helvetica Neue', system-ui, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace",
  },
  radii: {
    sm: '0px',
    md: '0px',
    lg: '0px',
    full: '999px',
  },
  shadows: {
    sm: 'none',
    md: 'none',
    lg: 'none',
    accent: 'none',
  },
  transitions: {
    fast: '160ms ease',
    base: '240ms ease',
    slow: '420ms cubic-bezier(0.22, 1, 0.36, 1)',
  },
  // 4px-based ladder. Every margin, padding and grid gap picks a step from
  // here — no loose values in component CSS. The viewport-responsive roles
  // built on top of it (--gap-section-head, --nav-h) live in index.css, since
  // these land as inline :root styles that a media query cannot override.
  space: {
    '2xs': '8px',
    xs: '12px',
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
    '2xl': '64px',
    '3xl': '80px',
    '4xl': '120px',
    '5xl': '160px',
  },
}
