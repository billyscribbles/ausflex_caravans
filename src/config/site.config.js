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
    // `menu` hangs a dropdown off this item, filled from live content rather
    // than a list here — see src/lib/vanLinks.js.
    { label: 'Our Vans', to: '/vans', menu: 'vans' },
    { label: 'Why Ausflex', to: '/why-ausflex' },
    { label: 'About Us', to: '/about' },
    { label: 'Gallery', to: '/gallery' },
    { label: '360', to: '/360' },
    { label: 'Dealers', to: '/dealers' },
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
          { label: 'Dealers', to: '/dealers' },
          { label: 'Contact', to: '/contact' },
        ],
      },
      // `source` instead of `links`: the column is built from the live range,
      // so adding or deleting a van in the dashboard updates the footer with
      // it. The column disappears on its own if the range is ever empty.
      { title: 'The Range', source: 'vans' },
    ],
    copyright: '© 2026 Ausflex Caravans. All rights reserved.',
  },

  social: {
    facebook: 'https://www.facebook.com/people/Ausflex-caravans/100083029877406/',
    instagram: 'https://www.instagram.com/ausflex.caravans',
    tiktok: 'https://www.tiktok.com/@ausflexcaravans',
  },

  contact: {
    email: 'ausflexcaravans@gmail.com',
    phone: '0451 712 116',
    phoneAlt: '0425 828 994',
    location: '1/27 Metrolink Cct, Campbellfield VIC 3061',
    hours: ['Mon – Fri: 7am – 5pm', 'Sat: 7am – 12pm'],
    // Name first, address second: Google resolves this to the Ausflex business
    // listing (rating and all) rather than a bare address pin, and falls back
    // to the address if the listing is ever renamed. The unit number is
    // percent-encoded so the slash survives the query string.
    mapUrl:
      'https://maps.google.com/maps?q=Ausflex+Caravans,+1%2F27+Metrolink+Cct,+Campbellfield+VIC+3061',
    // Keyless Google embed. Deliberately queried by address, NOT by business
    // name: a name match makes Google draw its own place card, which prints the
    // address held on the Google Business Profile ("27 Metrolink Cct") and
    // ignores anything we pass. Querying "Unit 1/27 …" geocodes to the unit
    // itself, so the card reads 1/27 and the pin lands on our door.
    mapEmbedUrl:
      'https://maps.google.com/maps?q=Unit+1%2F27+Metrolink+Cct,+Campbellfield+VIC+3061&z=16&output=embed',
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
