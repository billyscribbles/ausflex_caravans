// Kuula 360° virtual tours — home-page band + the dedicated /360 page.

// Every collection we publish, in picker order. `title` is doing two jobs: it
// is the button label in the /360 picker and the iframe's accessible name, so
// keep these short but self-describing.
const collections = [
  {
    title: 'Ausflex 23ft Club Lounge',
    src: 'https://kuula.co/share/collection/7T3NS?logo=1&info=0&logosize=117&fs=1&vr=1&initload=0&thumbs=1',
    poster: '/images/interior-galley.jpg',
  },
  {
    title: 'Ausflex On-Site Caravan',
    src: 'https://kuula.co/share/collection/7TR7f?logo=1&info=0&logosize=117&fs=1&vr=1&initload=0&thumbs=1',
    // The tour's own cover frame, so the facade is the room the player opens
    // on. Kuula only publishes it at 640², so it is soft on a wide frame —
    // swap in a full-size still of this interior when there is one.
    poster: '/images/tour-onsite.jpg',
  },
]

export const tour = {
  eyebrow: '360° virtual tour',
  heading: 'Take the walkthrough yourself.',
  sub: 'Look around every space in full 360°, exactly as it leaves the factory floor.',
  items: collections,

  // The first collection, flattened. The home band mounts exactly one tour and
  // never shows the picker, and the seed predates the list — both read these.
  src: collections[0].src,
  title: collections[0].title,
  // Facade image shown before the player loads; decorative — the launch
  // button carries the accessible name.
  poster: collections[0].poster,

  launchLabel: 'Launch 360° tour',
  // Renders with the copy column, so it appears on the home band only — the
  // /360 page drops that column and never links to itself.
  cta: { label: 'Open the full 360° page', to: '/360' },

  // Hero copy for the dedicated /360 page.
  page: {
    eyebrow: '360° virtual tour',
    heading: 'Step inside, from anywhere.',
    sub: 'Explore our vans in full 360° — walk the lounge, kitchen and bedrooms exactly as they leave the Campbellfield factory. Every van below has its own walkthrough: use the thumbnails to move between rooms, or go fullscreen for the lot.',
  },

  // Closes the /360 page on the same cinematic stage the home walkthrough
  // uses. No model plate — this is an owner’s van and an owner’s words, not a
  // product card.
  video: {
    eyebrow: 'Owner walkthrough',
    heading: 'An owner’s own',
    headingAccent: 'home on wheels.',
    sub: 'Leopards Go Wild take you end to end through their own Ausflex — the same walkthrough, in their words.',
    youtubeId: 'dm_HXjuyd8M',
    title: 'Owner walkthrough of an Ausflex caravan, filmed by Leopards Go Wild',
  },
}
