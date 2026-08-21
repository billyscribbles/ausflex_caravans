// Photo collections. `interiors` and `exteriors` feed the home-page mosaic
// sections; `page` feeds the full /gallery route.

export const gallery = {
  interiors: {
    eyebrow: 'Interiors',
    heading: 'Finished like a home, not a trailer.',
    sub: 'A closer look at the living, kitchen, bedroom and ensuite spaces — and the finishes you can choose between.',
    // The rail frames are 3:2, so the landscape shots sit uncropped; the
    // portraits between them alternate finish palettes (stone, olive, white).
    items: [
      {
        src: '/images/interior-club-dinette.jpg',
        alt: 'U-shaped club lounge in black leather around a stone dinette table',
        caption: 'Club lounge · Stone dinette',
      },
      {
        src: '/images/interior-galley.jpg',
        alt: 'Galley kitchen with stone splashback and oven, looking through to the bedroom',
        caption: 'Galley kitchen · Stone splashback',
      },
      {
        src: '/images/interior-lounge-tan.jpg',
        alt: 'Tan leather club lounge and timber table beside an olive green kitchen',
        caption: 'Club lounge · Tan leather',
      },
      {
        src: '/images/interior-kitchen-stone.jpg',
        alt: 'Kitchen with stone benchtop and black sink, bunks visible down the hallway',
        caption: 'Stone benchtop · Bunks beyond',
      },
      {
        src: '/images/interior-kitchen-olive.jpg',
        alt: 'Olive green kitchen with timber benchtop and oven, bed beyond',
        caption: 'Kitchen · Olive & timber',
      },
      {
        src: '/images/interior-living.jpg',
        alt: 'Open-plan living area with galley kitchen and lounge',
        caption: 'Open-plan living · Terrazzo bench',
      },
      {
        src: '/images/interior-ensuite-vanity.jpg',
        alt: 'Ensuite vanity with stone benchtop, fluted vessel basin and black tapware',
        caption: 'Ensuite · Vessel basin',
      },
      {
        src: '/images/interior-bedroom.jpg',
        alt: 'Caravan bedroom with made bed and dinette in the foreground',
        caption: 'Queen bedroom · Dinette forward',
      },
      {
        src: '/images/interior-bunk-nook.jpg',
        alt: 'Single bunk made up in cream linen with overhead lockers and timber floor',
        caption: 'Single bunk · Cream & timber',
      },
      {
        src: '/images/interior-bedroom-2.jpg',
        alt: 'Bedroom looking back through the van past the kitchen',
        caption: 'Bedroom · Gloss cabinetry',
      },
    ],
  },

  exteriors: {
    eyebrow: 'Exterior collection',
    heading: 'Presence. Protection. Purpose.',
    sub: 'Strong lines, practical storage and unmistakable Ausflex character.',
    items: [
      {
        src: '/images/exterior-explorer-21-studio.jpg',
        alt: 'Ausflex Explorer 21 in white and charcoal, front three-quarter studio view with the checkerplate toolbox open',
        caption: 'Explorer 21',
      },
      {
        src: '/images/exterior-family-adventurer-studio.jpg',
        alt: 'Ausflex Family Adventurer Off Road in cream and black, full side profile',
        caption: 'Family Adventurer Off Road',
      },
      {
        src: '/images/exterior-sea-breeze-studio.jpg',
        alt: 'Ausflex Sea Breeze in black and white, front three-quarter studio view',
        caption: 'Sea Breeze',
      },
      {
        src: '/images/exterior-explorer-charcoal.jpg',
        alt: 'Ausflex Explorer in charcoal, rear three-quarter studio view with the awning out',
        caption: 'Explorer · Charcoal',
      },
    ],
  },

  page: {
    eyebrow: 'Gallery',
    heading: 'Our photo gallery.',
    sub: 'The features, interiors and exteriors of our Australian-built vans, straight from the factory floor and the road.',
    // Ordered for the mosaic: the first tile is tall, and every 6n+4 tile is
    // wide — so portraits lead and the landscape shots land in the wide slots.
    items: [
      {
        src: '/images/interior-lounge-tan.jpg',
        alt: 'Tan leather club lounge and timber table beside an olive green kitchen',
      },
      {
        src: '/images/interior-club-dinette.jpg',
        alt: 'U-shaped club lounge in black leather around a stone dinette table',
      },
      { src: '/images/gallery-in-bedroom.jpg', alt: 'Bedroom with upholstered bedhead' },
      {
        src: '/images/exterior-explorer-charcoal.jpg',
        alt: 'Ausflex Explorer in charcoal, rear three-quarter studio view with the awning out',
      },
      {
        src: '/images/interior-kitchen-olive.jpg',
        alt: 'Olive green kitchen with timber benchtop and oven, bed beyond',
      },
      { src: '/images/gallery-in-bunks.jpg', alt: 'Bunk beds with reading lights' },
      {
        src: '/images/interior-galley.jpg',
        alt: 'Galley kitchen with stone splashback and oven, looking through to the bedroom',
      },
      {
        src: '/images/interior-ensuite-hall.jpg',
        alt: 'Hallway past the ensuite vanity and shower, looking through to the bedroom',
      },
      { src: '/images/gallery-in-kitchen.jpg', alt: 'Kitchen with timber benchtop and black sink' },
      {
        src: '/images/exterior-sea-breeze-studio.jpg',
        alt: 'Ausflex Sea Breeze in black and white, front three-quarter studio view',
      },
      {
        src: '/images/interior-bunk-nook.jpg',
        alt: 'Single bunk made up in cream linen with overhead lockers and timber floor',
      },
      { src: '/images/gallery-in-dinette.jpg', alt: 'Dinette with timber table' },
      {
        src: '/images/interior-ensuite-vanity.jpg',
        alt: 'Ensuite vanity with stone benchtop, fluted vessel basin and black tapware',
      },
      { src: '/images/gallery-ex-showroom.jpg', alt: 'Van outside the Ausflex showroom' },
      { src: '/images/gallery-in-club-lounge.jpg', alt: 'Club lounge in dark leather' },
      {
        src: '/images/exterior-family-adventurer-studio.jpg',
        alt: 'Ausflex Family Adventurer Off Road in cream and black, full side profile',
      },
      { src: '/images/gallery-in-hall.jpg', alt: 'Interior walkway from bedroom to living area' },
      { src: '/images/gallery-in-kitchen-white.jpg', alt: 'White kitchen with black cooktop' },
      {
        src: '/images/interior-kitchen-stone.jpg',
        alt: 'Kitchen with stone benchtop and black sink, bunks visible down the hallway',
      },
      { src: '/images/gallery-ex-factory.jpg', alt: 'Van parked at the factory entrance' },
      { src: '/images/gallery-in-dinette-mono.jpg', alt: 'Dinette in black and white finish' },
      {
        src: '/images/exterior-explorer-21-studio.jpg',
        alt: 'Ausflex Explorer 21 in white and charcoal, front three-quarter studio view with the checkerplate toolbox open',
      },
      { src: '/images/gallery-ex-dark.jpg', alt: 'Black off-road van, front three-quarter view' },
      { src: '/images/gallery-in-kitchen-2.jpg', alt: 'Compact kitchen with sink and cooktop' },
      { src: '/images/gallery-ex-fierce-1.jpg', alt: 'Fierce 18G van, rear view in green' },
      { src: '/images/gallery-ex-fierce-2.jpg', alt: 'Fierce hybrid at the factory' },
      { src: '/images/gallery-ex-fierce-3.jpg', alt: 'Fierce 18G rear panel and wheels' },
      {
        src: '/images/lifestyle-towing-road.jpg',
        alt: 'Four-wheel drive towing an Ausflex van in the rain',
      },
      {
        src: '/images/interior-lounge.jpg',
        alt: 'Club lounge upholstered in charcoal with soft throw',
      },
      {
        src: '/images/interior-kitchen.jpg',
        alt: 'Caravan kitchen with stone benchtop, gas cooktop and matte black tapware',
      },
      {
        src: '/images/interior-dining.jpg',
        alt: 'Kitchen and dining nook with timber benchtop and black mosaic splashback',
      },
      { src: '/images/gallery-ex-cream.jpg', alt: 'Cream and black tourer outside the factory' },
      {
        src: '/images/factory-build.jpg',
        alt: 'The Ausflex team on the factory floor during a build',
      },
      { src: '/images/factory-team.jpg', alt: 'Dinette under construction on the factory floor' },
      { src: '/images/gallery-ex-storm.jpg', alt: 'Dark green van under a stormy sky' },
      {
        src: '/images/lifestyle-towing-water.jpg',
        alt: 'Ausflex van and four-wheel drive parked at the water\u2019s edge',
      },
    ],
  },
}
