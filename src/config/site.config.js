// Single source of truth for brand identity, nav, SEO, integrations.
// Every new site starts by editing this file.

export const site = {
  brand: {
    name: 'Ausflex Caravans',
    logoText: 'AUSFLEX',
    tagline:
      'Australian-made caravans, custom built in Campbellfield, Victoria. Built to last, built for comfort.',
    // Optional image logo — if set, Navbar/Footer render this instead of logoText.
    logoSrc: '/brand/logo.png',
  },

  nav: [
    { label: 'Our Vans', to: '/vans' },
    { label: 'Why Ausflex', to: '/why-ausflex' },
    { label: 'About Us', to: '/about' },
    { label: 'Gallery', to: '/gallery' },
    { label: '360', to: '/360' },
  ],

  cta: {
    label: 'Contact Us',
    to: '/contact',
  },

  footer: {
    columns: [
      {
        title: 'Explore',
        links: [
          { label: 'Home', to: '/' },
          { label: 'Our Vans', to: '/vans' },
          { label: 'Why Ausflex', to: '/why-ausflex' },
          { label: 'About Us', to: '/about' },
          { label: 'Gallery', to: '/gallery' },
          { label: '360 Tour', to: '/360' },
          { label: 'Contact', to: '/contact' },
        ],
      },
      {
        title: 'The Range',
        links: [
          { label: '12ft Tuff Mudder', to: '/vans/tuff-mudder' },
          { label: '17ft Little Wonder', to: '/vans/little-wonder' },
          { label: '18.6ft Family Adventurer', to: '/vans/family-adventurer' },
          { label: '19.6ft Fierce Couple', to: '/vans/fierce-couple' },
          { label: '21.6ft Extreme Family', to: '/vans/extreme-family' },
          { label: 'On-Site Caravans', to: '/vans/on-site' },
        ],
      },
    ],
    copyright: '© 2026 Ausflex Caravans. All rights reserved.',
  },

  social: {
    facebook: 'https://www.facebook.com/profile.php?id=100083029877406',
    instagram: 'https://instagram.com/ausflex.caravans',
  },

  contact: {
    email: 'ausflexcaravans@gmail.com',
    phone: '0451 712 116',
    location: '27 Metrolink Cct, Campbellfield VIC 3061',
    hours: ['Mon – Fri: 7am – 5pm', 'Sat: 7am – 12pm'],
    mapUrl: 'https://maps.google.com/maps?ll=-37.651657,144.969702&z=14',
    // Keyless Google embed — q= keeps the marker + place card on the pin.
    mapEmbedUrl:
      'https://maps.google.com/maps?q=27+Metrolink+Cct,+Campbellfield+VIC+3061&z=14&output=embed',
  },

  seo: {
    defaultTitle: 'Ausflex Caravans — Built to Last, Built for Comfort',
    titleTemplate: '%s · Ausflex Caravans',
    description:
      "Victoria's boutique caravan manufacturer. Australian-built caravans with heavy-duty chassis, a 5-year warranty and made-to-order layouts, crafted in Campbellfield.",
    siteUrl: import.meta.env.VITE_SITE_URL || 'https://www.ausflexcaravans.com.au',
    ogImage: '/brand/og-image.jpg',
    locale: 'en_AU',
  },

  integrations: {
    formspreeId: import.meta.env.VITE_FORMSPREE_ID || '',
    gaId: import.meta.env.VITE_GA_ID || '',
  },
}
