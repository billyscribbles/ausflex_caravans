// The Ausflex range. Drives the Range section on the home page, the
// Our Vans listing page, and each /vans/:slug detail page.

export const vans = {
  eyebrow: 'The Range',
  heading: 'A van for every adventure.',
  sub: 'Single axle or dual, off-roading or highway cruising, couples or families. From the 12-foot Tuff Mudder to on-site vans up to 30 feet, every Ausflex is made to order.',
  items: [
    {
      slug: 'tuff-mudder',
      name: 'Tuff Mudder',
      length: '12ft',
      tag: 'Off-road hybrid',
      blurb: 'Small in size but big in features. Adventure on wheels, built tough to go off-road.',
      description: [
        'The Tuff Mudder really packs a punch on and off the road. At twelve feet it tows easily behind a mid-size vehicle, yet still fits a proper bed, kitchen and storage for a serious trip away.',
        'Like every Ausflex, it rides on a heavy-duty Australian chassis with Oz Trekker suspension, so the size is the only small thing about it.',
      ],
      image: '/images/van-tuff-mudder.jpg',
      imageAlt: 'Ausflex 12ft Tuff Mudder hybrid van, cutaway render showing interior layout',
      floorplan: '/images/plan-tuff-mudder.jpg',
      floorplanAlt: 'Floor plan of the 12ft Tuff Mudder',
      photos: [
        {
          src: '/images/photo-tuff-mudder.jpg',
          alt: 'Tuff Mudder hybrid van hitched and ready to tow',
          caption: 'Ready for the track',
        },
      ],
      specs: ['12ft body', 'Single axle', 'Off-road suspension', 'Sleeps 2'],
    },
    {
      slug: 'little-wonder',
      name: 'Little Wonder',
      length: '17ft',
      tag: 'Couples touring',
      blurb:
        'The 17-foot Little Wonder offers all the luxury of home, perfect for couple getaways.',
      description: [
        'The Little Wonder proves you do not need a big van to travel in comfort. Inside its seventeen feet you get a queen or double bed, full kitchen, lounge and ensuite, wrapped in the finishes Ausflex is known for.',
        'Light to tow and easy to park, it is the van for couples who want to get away often and stay comfortable when they do.',
      ],
      image: '/images/van-little-wonder.jpg',
      imageAlt: 'Ausflex 17ft Little Wonder caravan, side profile render',
      floorplan: '/images/plan-little-wonder.jpg',
      floorplanAlt: 'Floor plan of the 17ft Little Wonder with queen bed, kitchen and ensuite',
      photos: [
        {
          src: '/images/photo-little-wonder.jpg',
          alt: 'Little Wonder hybrid in black, parked side-on',
          caption: 'External view',
        },
        {
          src: '/images/photo-little-wonder-front.jpg',
          alt: 'Little Wonder front storage box and stone guard',
          caption: 'Front toolbox & stone guard',
        },
      ],
      specs: ['17ft body', 'Queen or double bed', 'Full ensuite', 'Sleeps 2'],
    },
    {
      slug: 'family-adventurer',
      name: 'Family Adventurer',
      length: '18.6ft',
      tag: 'Family touring',
      blurb:
        'With an option for 2 or 3 bunks, the 18.6-foot Family Adventurer has room for all the family.',
      description: [
        'The Family Adventurer packs beds for the whole crew into a van that still tows like a tourer. Choose two or three bunks alongside the main bed, with a full kitchen, dinette and ensuite.',
        'It is the van for families who want to show the kids the country without leaving comfort at home.',
      ],
      image: '/images/van-family-adventurer.jpg',
      imageAlt: 'Ausflex 18.6ft Family Adventurer caravan, side profile render',
      floorplan: '/images/plan-family-adventurer.jpg',
      floorplanAlt: 'Floor plan of the 18.6ft Family Adventurer with bunks',
      photos: [
        {
          src: '/images/gallery-ex-cream.jpg',
          alt: 'Family Adventurer in cream and black outside the Campbellfield factory',
          caption: 'Fresh off the line',
        },
        {
          src: '/images/photo-family-adventurer.jpg',
          alt: 'Family Adventurer with Fierce graphics, front three-quarter view',
          caption: 'Fierce edition',
        },
      ],
      specs: ['18.6ft body', '2 or 3 bunks', 'Full ensuite', 'Sleeps 4–5'],
    },
    {
      slug: 'fierce-couple',
      name: 'Fierce Couple Deluxe',
      length: '19.6ft',
      tag: 'Deluxe touring',
      blurb: 'For the serious adventurers. Hit the road with all the comforts of being at home.',
      description: [
        'The Fierce Couple Deluxe is nineteen and a half feet of full-time touring comfort: a proper bedroom, big lounge, full kitchen and a deluxe ensuite, finished to the standard the name promises.',
        'If you are planning the big lap, this is the van built for it.',
      ],
      image: '/images/van-fierce-couple.jpg',
      imageAlt: 'Ausflex 19.6ft Fierce Couple Deluxe caravan, side profile render',
      floorplan: '/images/plan-fierce-couple.jpg',
      floorplanAlt: 'Floor plan of the 19.6ft Fierce Couple Deluxe',
      photos: [
        {
          src: '/images/photo-fierce-interior-1.jpg',
          alt: 'Fierce Couple Deluxe interior, kitchen and bench detail',
          caption: 'Interior finish',
        },
        {
          src: '/images/photo-fierce-interior-2.jpg',
          alt: 'Fierce Couple Deluxe interior looking toward the living area',
          caption: 'Living space',
        },
      ],
      specs: ['19.6ft body', 'Dual axle', 'Deluxe ensuite', 'Sleeps 2'],
    },
    {
      slug: 'extreme-family',
      name: 'Extreme Family',
      length: '21.6ft',
      tag: 'Full-size family',
      blurb: 'The ultimate in family caravanning, with a queen or double bed plus 2 or 3 bunks.',
      description: [
        'The Extreme Family is our full-size family tourer. Choose a queen or double bed and two or three bunks, so the whole family hits the road with all the comforts of being at home.',
        'Dual axles, serious storage and the same Australian-steel chassis underneath: this is as much van as most families will ever need.',
      ],
      image: '/images/van-extreme-family.jpg',
      imageAlt: 'Ausflex 21.6ft Extreme Family caravan, side profile render',
      floorplan: '/images/plan-extreme-family.jpg',
      floorplanAlt: 'Floor plan of the 21.6ft Extreme Family van',
      photos: [
        {
          src: '/images/photo-extreme.jpg',
          alt: 'Extreme Family van on the road in dark grey',
          caption: 'On the road',
        },
        {
          src: '/images/photo-extreme-build.jpg',
          alt: 'Extreme Family van frame during construction at the factory',
          caption: 'During the build',
        },
      ],
      specs: ['21.6ft body', 'Dual axle', 'Queen/double + bunks', 'Sleeps 4–6'],
    },
    {
      slug: 'on-site',
      name: 'On-Site Caravans',
      length: 'Up to 30ft',
      tag: 'Custom on-site',
      blurb: 'Custom-built on-site caravans designed around your unique needs, up to 30 feet.',
      description: [
        'Not every van needs to chase the horizon. Our on-site caravans are custom built for permanent and semi-permanent living: holiday parks, granny flats, site offices and weekenders.',
        'Up to thirty feet, designed around your block and the way you will use it, with the same build quality as our touring range.',
      ],
      image: '/images/van-onsite.jpg',
      imageAlt: 'Ausflex on-site caravan render with fold-out deck',
      floorplan: null,
      floorplanAlt: null,
      photos: [],
      specs: ['Up to 30ft', 'Custom layouts', 'Permanent siting', 'Built to order'],
    },
  ],
}
