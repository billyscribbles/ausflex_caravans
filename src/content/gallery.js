// Photo collections, grouped by subject so a photo only ever lives in one
// place on a given page. `interiors` feeds the home-page rail; `exteriors` and
// `page` feed the two bands on /gallery, so nothing repeats between them:
//
//   interiors  → inside shots (home rail)
//   exteriors  → outside shots, studio plates and on-location (/gallery band)
//   page       → interiors, factory and lifestyle (/gallery mosaic)

export const gallery = {
  interiors: {
    eyebrow: 'Interiors',
    // Split so the closing phrase can run bronze, the way the hero sets
    // "BUILT TO EXPLORE." — see .display-statement in index.css.
    heading: 'Finished like a home,',
    headingAccent: 'not a trailer.',
    sub: 'Living, kitchen, bedroom and ensuite — and the finishes you choose between.',
    // The rail frames are 3:2, so the landscape shots sit uncropped; the
    // portraits between them alternate finish palettes (stone, olive, white).
    items: [
      {
        src: '/images/interior-club-dinette.jpg',
        alt: 'U-shaped club lounge in black leather around a round timber dinette table',
        caption: 'Club lounge · Stone & timber',
      },
      {
        src: '/images/interior-galley.jpg',
        alt: 'Galley kitchen with stone splashback and oven, looking through to the bedroom',
        caption: 'Galley kitchen · Stone splashback',
      },
      {
        src: '/images/interior-kitchen-olive.jpg',
        alt: 'Olive green kitchen with timber benchtop and oven, bed beyond',
        caption: 'Kitchen · Olive & timber',
      },
      {
        src: '/images/interior-kitchen-stone.jpg',
        alt: 'Kitchen with stone benchtop and black sink, bunks visible down the hallway',
        caption: 'Stone benchtop · Bunks beyond',
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
        src: '/images/interior-ensuite-hall.jpg',
        alt: 'Hallway past the ensuite vanity and shower, looking through to the bedroom',
        caption: 'Ensuite & hallway · Timber floor',
      },
      {
        src: '/images/interior-bedroom-2.jpg',
        alt: 'Bedroom at the far end of the van, past the gloss kitchen and marble dinette',
        caption: 'Bedroom · Gloss cabinetry',
      },
    ],
  },

  // Every outside shot lives here — the four studio plates and the on-location
  // photography — so /gallery never shows the same van twice. Ordered for the
  // mosaic (see GalleryGrid.css): portraits take the tall slots at 9n+1, the
  // side profiles take the wide slots at 9n+4 and 9n+8.
  exteriors: {
    eyebrow: 'Exterior collection',
    heading: 'Presence. Protection. Purpose.',
    sub: 'Strong lines, practical storage and unmistakable Ausflex character.',
    items: [
      {
        src: '/images/gallery-ex-dark.jpg',
        alt: 'Ausflex Xtreme 18 in charcoal with yellow graphics, front three-quarter view outside the showroom',
        caption: 'Xtreme 18 · Showroom',
      },
      {
        src: '/images/exterior-explorer-21-studio.jpg',
        alt: 'Ausflex Explorer 21 in white and charcoal, front three-quarter studio view over the checkerplate toolbox',
        caption: 'Explorer 21',
      },
      {
        src: '/images/exterior-sea-breeze-studio.jpg',
        alt: 'Ausflex Sea Breeze in black and white, front three-quarter studio view',
        caption: 'Sea Breeze',
      },
      {
        src: '/images/exterior-family-adventurer-studio.jpg',
        alt: 'Ausflex Family Adventurer Off Road in cream and black, full side profile',
        caption: 'Family Adventurer Off Road',
      },
      {
        src: '/images/gallery-ex-cream.jpg',
        alt: 'Ausflex Family Adventurer 20.6 Off Road in cream and black, side profile kerbside',
        caption: 'Family Adventurer 20.6',
      },
      {
        src: '/images/gallery-ex-storm.jpg',
        alt: 'Ausflex Xtreme 21 in olive with blue graphics, front three-quarter under a stormy sky',
        caption: 'Xtreme 21 · Storm light',
      },
      {
        src: '/images/gallery-ex-fierce-1.jpg',
        alt: 'Ausflex Fierce 18.6 in green and black, side view with the awning arm folded along the wall',
        caption: 'Fierce 18.6 · Side',
      },
      {
        src: '/images/exterior-explorer-charcoal.jpg',
        alt: 'Ausflex Explorer in charcoal, rear three-quarter studio view',
        caption: 'Explorer · Charcoal',
      },
      {
        src: '/images/gallery-ex-fierce-3.jpg',
        alt: 'Rear panel of the Ausflex Fierce 18.6 in green, spare wheel mounted on the checkerplate',
        caption: 'Fierce 18.6 · Rear',
      },
      {
        src: '/images/gallery-ex-factory.jpg',
        alt: 'Ausflex Sea Breeze parked at the factory entrance',
        caption: 'Sea Breeze · Factory',
      },
      {
        src: '/images/gallery-ex-fierce-2.jpg',
        alt: 'Ausflex Fierce 18.6 in green, rear three-quarter at the factory',
        caption: 'Fierce 18.6 · Factory',
      },
    ],
  },

  page: {
    eyebrow: 'Gallery',
    heading: 'Our photo gallery.',
    sub: 'The features, interiors and exteriors of our Australian-built vans, straight from the factory floor and the road.',
    // The mosaic runs below the exteriors band, far enough down the page that
    // the hero above is off screen by the time it starts. Without a head of
    // its own it read as an unlabelled wall of photos, so it carries one —
    // and every tile carries a caption, the way the exteriors band does.
    band: {
      eyebrow: 'Interiors & the build',
      heading: 'Inside the vans, and the shop that builds them.',
      sub: 'Kitchens, lounges, bedrooms and ensuites — then the Campbellfield floor they are built on and the roads they end up on.',
    },
    // Interiors, factory and lifestyle — the exteriors band above owns every
    // outside shot. Ordered for the mosaic, which tiles in blocks of 9 (see
    // GalleryGrid.css): 9n+1 is tall so it takes a portrait, and 9n+4 / 9n+8
    // are wide so they take a landscape. 22 items closes the last block flush.
    items: [
      {
        src: '/images/interior-lounge-tan.jpg',
        alt: 'Tan leather club lounge and timber table beside an olive green kitchen',
        caption: 'Club lounge · Tan & olive',
      },
      {
        src: '/images/interior-kitchen-olive.jpg',
        alt: 'Olive green kitchen with timber benchtop and oven, bed beyond',
        caption: 'Kitchen · Olive & timber',
      },
      {
        src: '/images/interior-ensuite-vanity.jpg',
        alt: 'Ensuite vanity with stone benchtop, fluted vessel basin and black tapware',
        caption: 'Ensuite · Vessel basin',
      },
      {
        src: '/images/interior-club-dinette.jpg',
        alt: 'U-shaped club lounge in black leather around a round timber dinette table',
        caption: 'Club lounge · Stone & timber',
      },
      {
        src: '/images/interior-living.jpg',
        alt: 'Open-plan living area with galley kitchen and lounge',
        caption: 'Open-plan living · Terrazzo bench',
      },
      {
        src: '/images/interior-kitchen.jpg',
        alt: 'Caravan kitchen with stone benchtop, gas cooktop and matte black tapware',
        caption: 'Kitchen · Stone & black tapware',
      },
      {
        src: '/images/gallery-in-kitchen-2.jpg',
        alt: 'Galley kitchen with timber benchtop and black sink, looking through to the ensuite',
        caption: 'Galley · Timber & black sink',
      },
      {
        src: '/images/interior-galley.jpg',
        alt: 'Galley kitchen with stone splashback and oven, looking through to the bedroom',
        caption: 'Galley kitchen · Stone splashback',
      },
      {
        src: '/images/interior-lounge.jpg',
        alt: 'Club lounge upholstered in charcoal with soft throw',
        caption: 'Club lounge · Charcoal',
      },
      {
        src: '/images/interior-bedroom.jpg',
        alt: 'Caravan bedroom with made bed and dinette in the foreground',
        caption: 'Queen bedroom · Dinette forward',
      },
      {
        src: '/images/gallery-in-dinette.jpg',
        alt: 'Tan leather dinette with a timber table, kitchen and bunks beyond',
        caption: 'Dinette · Tan leather',
      },
      {
        src: '/images/interior-bedroom-2.jpg',
        alt: 'Bedroom at the far end of the van, past the gloss kitchen and marble dinette',
        caption: 'Bedroom · Gloss cabinetry',
      },
      {
        src: '/images/interior-kitchen-stone.jpg',
        alt: 'Kitchen with stone benchtop and black sink, bunks visible down the hallway',
        caption: 'Stone benchtop · Bunks beyond',
      },
      {
        src: '/images/gallery-in-bunks.jpg',
        alt: 'Twin bunks in cream linen beside a full-height wardrobe',
        caption: 'Twin bunks · Full-height robe',
      },
      {
        src: '/images/interior-bunk-nook.jpg',
        alt: 'Single bunk made up in cream linen with overhead lockers and timber floor',
        caption: 'Single bunk · Cream & timber',
      },
      {
        src: '/images/interior-ensuite-hall.jpg',
        alt: 'Hallway past the ensuite vanity and shower, looking through to the bedroom',
        caption: 'Ensuite & hallway · Timber floor',
      },
      {
        src: '/images/lifestyle-towing-road.jpg',
        alt: 'Four-wheel drive towing an Ausflex van on a wet road',
        caption: 'On tow · Wet highway',
      },
      {
        src: '/images/gallery-in-dinette-mono.jpg',
        alt: 'Marble dinette and black kitchen in a monochrome finish',
        caption: 'Dinette · Marble & monochrome',
      },
      {
        src: '/images/interior-dining.jpg',
        alt: 'Kitchen and dining nook with timber benchtop and black mosaic splashback',
        caption: 'Dining nook · Mosaic splashback',
      },
      {
        src: '/images/factory-build.jpg',
        alt: 'Vans under construction on the Ausflex factory floor',
        caption: 'Campbellfield · On the floor',
      },
      {
        src: '/images/factory-team.jpg',
        alt: 'The Ausflex team on the roof of a van during a build',
        caption: 'The build team · Roof up',
      },
      {
        src: '/images/lifestyle-towing-water.jpg',
        alt: 'Ausflex Xtreme 21 parked at the water’s edge',
        caption: 'Xtreme 21 · Water’s edge',
      },
    ],
  },
}
