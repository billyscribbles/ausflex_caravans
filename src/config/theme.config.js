// Single source of truth for design tokens.
// Swap a brand's look by editing this file — applyTheme.js writes these
// onto :root as CSS custom properties at app boot.

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
    dark: '#191713',
    'dark-deep': '#12100d',
  },
  fonts: {
    display: "'Manrope', 'Avenir Next', system-ui, sans-serif",
    body: "'Hanken Grotesk', 'Helvetica Neue', system-ui, sans-serif",
  },
  radii: {
    sm: '10px',
    md: '16px',
    lg: '22px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 3px rgba(23, 21, 18, 0.06), 0 1px 2px rgba(23, 21, 18, 0.04)',
    md: '0 6px 20px rgba(23, 21, 18, 0.07), 0 2px 6px rgba(23, 21, 18, 0.05)',
    lg: '0 18px 50px rgba(23, 21, 18, 0.12), 0 4px 14px rgba(23, 21, 18, 0.06)',
    accent: '0 8px 28px rgba(185, 154, 112, 0.28)',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '240ms cubic-bezier(0.22, 1, 0.36, 1)',
    slow: '400ms cubic-bezier(0.22, 1, 0.36, 1)',
  },
}
