// Single source of truth for design tokens.
// Swap a brand's look by editing this file — applyTheme.js writes these
// onto :root as CSS custom properties at app boot.

export const theme = {
  colors: {
    bg: '#faf9f7',
    'bg-alt': '#f3f1ee',
    'bg-card': '#ffffff',
    text: '#18181b',
    'text-soft': '#3f3f46',
    muted: '#71717a',
    accent: '#0c8c81',
    'accent-dark': '#0a7268',
    'accent-light': '#d0f5f0',
    'accent-glow': 'rgba(12, 140, 129, 0.12)',
    border: 'rgba(24, 24, 27, 0.09)',
    'border-strong': 'rgba(24, 24, 27, 0.18)',
    dark: '#111113',
  },
  fonts: {
    display: "'Fraunces', Georgia, serif",
    body: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  radii: {
    sm: '8px',
    md: '14px',
    lg: '22px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 3px rgba(24, 24, 27, 0.06), 0 1px 2px rgba(24, 24, 27, 0.04)',
    md: '0 4px 16px rgba(24, 24, 27, 0.08), 0 2px 6px rgba(24, 24, 27, 0.05)',
    lg: '0 12px 40px rgba(24, 24, 27, 0.1), 0 4px 12px rgba(24, 24, 27, 0.06)',
    accent: '0 8px 32px rgba(12, 140, 129, 0.2)',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '220ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
}
