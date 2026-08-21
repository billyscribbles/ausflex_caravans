// Kuula 360° virtual tour — home-page band + the dedicated /360 page.
export const tour = {
  eyebrow: '360° virtual tour',
  heading: 'Take the walkthrough yourself.',
  sub: 'Look around every space in full 360°, exactly as it leaves the factory floor.',
  src: 'https://kuula.co/share/collection/7T3NS?logo=1&info=0&logosize=117&fs=1&vr=1&initload=0&thumbs=1',
  title: 'Ausflex Caravans 360° virtual tour',
  launchLabel: 'Launch 360° tour',
  // Renders with the copy column, so it appears on the home band only — the
  // /360 page drops that column and never links to itself.
  cta: { label: 'Open the full 360° page', to: '/360' },
  // Facade image shown before the player loads; decorative — the launch
  // button carries the accessible name.
  poster: '/images/interior-galley.jpg',

  // Hero copy for the dedicated /360 page.
  page: {
    eyebrow: '360° virtual tour',
    heading: 'Step inside, from anywhere.',
    sub: 'Explore our vans in full 360° — walk the lounge, kitchen and bedrooms exactly as they leave the Campbellfield factory. Use the thumbnails to move between vans, or go fullscreen for the full walkthrough.',
  },
}
