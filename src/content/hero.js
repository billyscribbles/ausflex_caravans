export const hero = {
  eyebrow: '',
  // Each line renders as lead + accented tail, per the approved comp:
  // "BUILT TO EXPLORE." / "MADE TO LAST." with the closing word in bronze.
  headline: [
    { lead: 'Built to', accent: 'explore.' },
    { lead: 'Made to', accent: 'last.' },
  ],
  subheadline: 'Premium caravans. Australian made. Built to your spec.',
  primaryCta: { label: 'Explore our range', to: '/vans' },
  secondaryCta: { label: 'Book a visit', to: '/contact' },
  aside:
    'Australian made for Australian conditions, and every one made to order. Come and see the range in Campbellfield, then choose the layout, the finishes and the features that make it yours.',
  image: '/images/hero-exterior-wordmark-v2.jpg',
  imageSrcset:
    '/images/hero-exterior-wordmark-v2-960.jpg 960w, /images/hero-exterior-wordmark-v2.jpg 1774w',
  imageSizes: '100vw',
  imageAlt:
    'Ausflex caravan in bronze and black on wet ground below a dark mountain range, entry door open and the Ausflex wordmark glowing across the sky behind it',
}
