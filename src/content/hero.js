export const hero = {
  eyebrow: '',
  // Each line renders as lead + accented tail, per the approved comp:
  // "BUILT TO EXPLORE." / "MADE TO LAST." with the closing word in bronze.
  headline: [
    { lead: 'Built to', accent: 'explore.' },
    { lead: 'Made to', accent: 'last.' },
  ],
  subheadline: 'Premium caravans. Australian made. Adventure ready.',
  primaryCta: { label: 'Explore our range', to: '/vans' },
  secondaryCta: null,
  aside:
    'Australian made for Australian conditions. Ausflex Caravans are engineered for comfort, built for tough adventures, and designed to keep you moving.',
  image: '/images/hero-exterior-wordmark.jpg',
  imageSrcset:
    '/images/hero-exterior-wordmark-960.jpg 960w, /images/hero-exterior-wordmark.jpg 1774w',
  imageSizes: '100vw',
  imageAlt:
    'Ausflex caravan in bronze and black on wet ground below a dark mountain range, entry door open and the Ausflex wordmark glowing across the sky behind it',
}
