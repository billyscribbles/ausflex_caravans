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
}
