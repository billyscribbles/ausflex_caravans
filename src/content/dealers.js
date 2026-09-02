// Dealer network page — where to see the Ausflex range beyond Campbellfield.
export const dealersPage = {
  eyebrow: 'Australia & New Zealand',
  heading: 'Find Ausflex near you.',
  intro:
    'Ausflex vans are on display with our dealer partners across Australia and New Zealand, and our mobile dealer travels the country full time. Call ahead to see what’s on the lot — or come to the factory in Campbellfield and spec your own.',
  // Every dealer has a name, region, blurb and phone. A fixed dealer adds an
  // address + mapUrl and a website; a mobile dealer has a location line and an
  // email instead, and the page renders whichever rows are present.
  dealers: [
    {
      name: 'Sunrise Caravans',
      region: 'Queensland, Australia',
      blurb: 'RV dealer in Burpengary East, on Brisbane’s north side — see Ausflex in Queensland.',
      address: '290 Eastern Service Rd, Burpengary East QLD 4505',
      mapUrl: 'https://maps.google.com/maps?q=290+Eastern+Service+Rd,+Burpengary+East+QLD+4505',
      phone: { label: '(07) 3888 4455', href: 'tel:+61738884455' },
      website: { label: 'sunrisecaravans.com.au', href: 'https://www.sunrisecaravans.com.au' },
    },
    {
      name: 'Rugged Kiwi Caravans',
      region: 'Waikato, New Zealand',
      blurb: 'RV dealer in Hamilton — the home of Ausflex across the Tasman.',
      address: '2 Kells Place, Hamilton 3204',
      mapUrl: 'https://maps.google.com/maps?q=2+Kells+Place,+Hamilton+3204,+New+Zealand',
      phone: { label: '+64 20 4000 3882', href: 'tel:+642040003882' },
      website: { label: 'ruggedkiwi.co.nz', href: 'https://ruggedkiwi.co.nz' },
    },
    {
      name: 'Ausflex Mobile Dealer',
      region: 'Australia wide',
      blurb:
        'Factory-direct pricing, Australia wide. They live on the road full time in their own Ausflex, so they don’t just sell the lifestyle — they live it 24/7.',
      location: 'On the road, Australia wide — no fixed yard.',
      phone: { label: '0412 259 169', href: 'tel:+61412259169' },
      email: { label: 'breakingfree247@icloud.com', href: 'mailto:breakingfree247@icloud.com' },
    },
  ],
}
