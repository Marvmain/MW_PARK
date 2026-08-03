import { Cottage } from './types';

export const COTTAGES_DATA: Cottage[] = [
  // ─── FACILITY RENTALS ──────────────────────────────────────────────────────

  {
    id: 'fac_kubo_big',
    name: 'Kubo (Big)',
    type: 'Facility Rental — Large Kubo',
    tagline: 'A spacious traditional nipa kubo for big groups and family gatherings.',
    description: 'Rent our large nipa kubo for your group — perfect for picnics, celebrations, and shaded riverside relaxation.',
    longDescription: 'The Big Kubo is a traditional Filipino nipa hut with ample floor space to accommodate larger groups. Its wide open-air design keeps it cool and breezy, making it the ideal shaded base camp for families, barkadas, and corporate outings who want a comfortable place to gather, eat, and rest between activities along the Pandan River.',
    capacity: 'Up to 15 Guests',
    ratePerDay: 500,
    image: '/assets/images/kubo.jpg',
    amenities: [
      'Spacious nipa-roofed open-air floor area',
      'Bamboo bench seating around the perimeter',
      'Ideal for group meals and celebrations',
      'Shaded from direct sunlight throughout the day'
    ],
    ecologicalSpecs: [
      'Built with locally-sourced nipa palm and bamboo materials',
      'Natural ventilation design — no electricity required',
      'Guests are asked to leave the area clean after use'
    ],
    builtFrom: 'Nipa Palm Roof & Bamboo Frame',
    stiltHeight: 'Ground level'
  },
  {
    id: 'fac_kubo_small',
    name: 'Kubo (Small)',
    type: 'Facility Rental — Small Kubo',
    tagline: 'A cozy nipa kubo for small groups and intimate riverside picnics.',
    description: 'Rent our small nipa kubo — the perfect shaded nook for small families or groups looking for a private riverside spot.',
    longDescription: 'The Small Kubo is a compact, charming nipa hut ideal for smaller groups who want their own dedicated space along the riverbank. Whether you\'re settling in for a packed lunch, resting between river activities, or just enjoying the natural scenery in the shade, this cozy kubo provides the perfect spot at an affordable rate.',
    capacity: 'Up to 6 Guests',
    ratePerDay: 400,
    image: '/assets/images/kubobig.jpg',
    amenities: [
      'Compact nipa-roofed shaded space',
      'Bamboo bench seating',
      'Private, intimate riverside setting',
      'Close proximity to river activities'
    ],
    ecologicalSpecs: [
      'Constructed from sustainably harvested nipa and bamboo',
      'Zero electricity footprint',
      'Guests are asked to maintain cleanliness during and after use'
    ],
    builtFrom: 'Nipa Palm Roof & Bamboo Frame',
    stiltHeight: 'Ground level'
  },
  {
    id: 'fac_table_umbrella',
    name: 'Table with Umbrella',
    type: 'Facility Rental — Outdoor Table Set',
    tagline: 'A shaded outdoor table set — perfect for riverside dining and relaxation.',
    description: 'Rent a riverside table with a large umbrella for shade — great for small groups who want a simple outdoor setup.',
    longDescription: 'Our outdoor table-and-umbrella sets are positioned at scenic spots along the riverbank, giving guests a comfortable place to sit, eat, and unwind without needing to reserve a full kubo or cottage. Each set comes with a durable table and bench seating for small groups, shaded by a wide umbrella to keep you cool under the Pandan sun.',
    capacity: 'Up to 4 Guests',
    ratePerDay: 200,
    image: '/assets/images/umbrella.jpg',
    amenities: [
      'Large shade umbrella',
      'Sturdy outdoor table',
      'Bench seating for up to 4 guests',
      'Scenic riverside placement'
    ],
    ecologicalSpecs: [
      'Durable weatherproof materials for outdoor riverside use',
      'Guests must clean up food waste before leaving',
      'Plastic and single-use items are not allowed at the riverside'
    ],
    builtFrom: 'Weatherproof Outdoor Furniture & UV-Resistant Umbrella',
    stiltHeight: 'Ground level'
  },
  {
    id: 'fac_arko',
    name: 'Arko',
    type: 'Facility Rental — Covered Pavilion',
    tagline: 'A premium covered pavilion for events, group dining, and celebrations.',
    description: 'Rent the Arko — our largest covered pavilion — for group events, parties, and special occasions at the river park.',
    longDescription: 'The Arko is MW Adventure Park\'s premier covered pavilion, designed for large events, corporate outings, birthday parties, and reunions. With ample covered floor space, the Arko can accommodate large groups comfortably. Its open-sided design keeps it naturally ventilated while providing full overhead protection from the sun and rain, making it the ideal venue for any riverside gathering. Tables and seating arrangements can be coordinated with park staff.',
    capacity: 'Up to 50 Guests',
    ratePerDay: 1000,
    image: '/assets/images/arko.jpg',
    amenities: [
      'Large covered pavilion with full overhead rain and sun protection',
      'Open-sided design for natural river breeze ventilation',
      'Accommodates large groups and events',
      'Flexible table and seating arrangements (coordinate with staff)',
      'Ideal for parties, reunions, and corporate outings'
    ],
    ecologicalSpecs: [
      'Built with locally-sourced timber and roofing materials',
      'Waste management is strictly enforced during events',
      'Single-use plastics are prohibited within the park grounds'
    ],
    builtFrom: 'Timber Frame with Metal Roofing',
    stiltHeight: 'Ground level'
  }
];