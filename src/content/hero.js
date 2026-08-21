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
  image: '/images/hero-exterior-studio.jpg',
  imageSrcset: '/images/hero-exterior-studio-960.jpg 960w, /images/hero-exterior-studio.jpg 1448w',
  imageSizes: '100vw',
  imageAlt:
    'Ausflex caravan in bronze and black, side profile in a dark studio with the entry door open',
}
