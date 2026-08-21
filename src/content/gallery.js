// Photo collections. `interiors` and `exteriors` feed the home-page mosaic
// sections; `page` feeds the full /gallery route.

export const gallery = {
  interiors: {
    eyebrow: 'Interior collection',
    heading: 'Designed to feel like home.',
    sub: 'A closer look at the living, kitchen and bedroom spaces.',
    items: [
      {
        src: '/images/interior-living.jpg',
        alt: 'Open-plan living area with galley kitchen and lounge',
        caption: 'Living space',
      },
      {
        src: '/images/interior-kitchen.jpg',
        alt: 'Caravan kitchen with stone benchtop, gas cooktop and matte black tapware',
        caption: 'Kitchen',
      },
      {
        src: '/images/interior-bedroom.jpg',
        alt: 'Caravan bedroom with made bed and dinette in the foreground',
        caption: 'Bedroom',
      },
      {
        src: '/images/interior-lounge.jpg',
        alt: 'Club lounge upholstered in charcoal with soft throw',
        caption: 'Lounge',
      },
      {
        src: '/images/interior-dining.jpg',
        alt: 'Kitchen and dining nook with oven and rattan pendant light',
        caption: 'Kitchen & dining',
      },
      {
        src: '/images/interior-bedroom-2.jpg',
        alt: 'Bedroom looking back through the van past the kitchen',
        caption: 'Bedroom',
      },
    ],
  },

  exteriors: {
    eyebrow: 'Exterior collection',
    heading: 'Presence. Protection. Purpose.',
    sub: 'Strong lines, practical storage and unmistakable Ausflex character.',
    items: [
      {
        src: '/images/gallery-ex-cream.jpg',
        alt: 'Cream and black Ausflex tourer outside the factory',
        caption: 'Family Adventurer',
      },
      {
        src: '/images/gallery-ex-storm.jpg',
        alt: 'Dark green Ausflex van under a stormy sky',
        caption: 'Built for any weather',
      },
      {
        src: '/images/lifestyle-towing-water.jpg',
        alt: 'Ausflex van and four-wheel drive parked at the water’s edge',
        caption: 'At the water',
      },
      {
        src: '/images/gallery-ex-dark.jpg',
        alt: 'Black off-road Ausflex van, front three-quarter view',
        caption: 'Off-road spec',
      },
    ],
  },

  page: {
    eyebrow: 'Gallery',
    heading: 'Our photo gallery.',
    sub: 'The features, interiors and exteriors of our Australian-built vans, straight from the factory floor and the road.',
    items: [
      { src: '/images/gallery-ex-cream.jpg', alt: 'Cream and black tourer outside the factory' },
      { src: '/images/gallery-in-kitchen.jpg', alt: 'Kitchen with timber benchtop and black sink' },
      { src: '/images/gallery-in-lounge.jpg', alt: 'Lounge with marble-look benchtop nearby' },
      { src: '/images/gallery-ex-storm.jpg', alt: 'Dark green van under a stormy sky' },
      { src: '/images/gallery-in-bedroom.jpg', alt: 'Bedroom with upholstered bedhead' },
      { src: '/images/gallery-in-bunks.jpg', alt: 'Bunk beds with reading lights' },
      { src: '/images/gallery-ex-seabreeze.jpg', alt: 'Sea Breeze van in black and white' },
      { src: '/images/gallery-in-dinette.jpg', alt: 'Dinette with timber table' },
      { src: '/images/gallery-in-kitchen-white.jpg', alt: 'White kitchen with black cooktop' },
      { src: '/images/gallery-ex-factory.jpg', alt: 'Van parked at the factory entrance' },
      { src: '/images/gallery-in-club-lounge.jpg', alt: 'Club lounge in dark leather' },
      { src: '/images/gallery-in-hall.jpg', alt: 'Interior walkway from bedroom to living area' },
      { src: '/images/gallery-ex-showroom.jpg', alt: 'Van outside the Ausflex showroom' },
      { src: '/images/gallery-in-dinette-mono.jpg', alt: 'Dinette in black and white finish' },
      { src: '/images/gallery-in-kitchen-2.jpg', alt: 'Compact kitchen with sink and cooktop' },
      { src: '/images/gallery-ex-fierce-1.jpg', alt: 'Fierce 18G van, rear view in green' },
      { src: '/images/gallery-ex-fierce-2.jpg', alt: 'Fierce hybrid at the factory' },
      { src: '/images/gallery-ex-fierce-3.jpg', alt: 'Fierce 18G rear panel and wheels' },
      { src: '/images/lifestyle-towing-road.jpg', alt: 'Four-wheel drive towing an Ausflex van in the rain' },
      { src: '/images/factory-team.jpg', alt: 'Dinette under construction on the factory floor' },
      { src: '/images/factory-build.jpg', alt: 'The Ausflex team on the factory floor during a build' },
      { src: '/images/gallery-ex-dark.jpg', alt: 'Black off-road van, front three-quarter view' },
    ],
  },
}
