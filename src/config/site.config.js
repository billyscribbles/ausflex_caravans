// Single source of truth for brand identity, nav, SEO, integrations.
// Every new site starts by editing this file.

export const site = {
  brand: {
    name: 'Foundation Studio',
    logoText: 'FOUNDATION',
    tagline: 'A lean studio building digital products for businesses that want results.',
    // Optional image logo — if set, Navbar/Footer render this instead of logoText.
    // Drop the file into /public/brand/ and reference it like "/brand/logo.svg".
    logoSrc: null,
  },

  nav: [
    { label: 'Services', to: '/services' },
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact' },
  ],

  cta: {
    label: 'Get a Quote',
    to: '/contact',
  },

  footer: {
    columns: [
      {
        title: 'Navigation',
        links: [
          { label: 'Home', to: '/' },
          { label: 'Services', to: '/services' },
          { label: 'About', to: '/about' },
          { label: 'Contact', to: '/contact' },
        ],
      },
    ],
    copyright: '© 2025 Foundation Studio. All rights reserved.',
  },

  social: {
    linkedin: '',
    instagram: '',
    twitter: '',
  },

  contact: {
    email: 'hello@example.com',
    phone: '',
    location: 'Melbourne, Australia',
  },

  seo: {
    defaultTitle: 'Foundation Studio — Web Design & Development',
    titleTemplate: '%s · Foundation Studio',
    description: 'We build fast, modern websites for small businesses.',
    siteUrl: import.meta.env.VITE_SITE_URL || 'https://example.com',
    // Replace with a 1200x630 PNG before launch — social platforms ignore SVG.
    ogImage: '/brand/og-image.svg',
    locale: 'en_AU',
  },

  integrations: {
    formspreeId: import.meta.env.VITE_FORMSPREE_ID || '',
    gaId: import.meta.env.VITE_GA_ID || '',
  },
}
