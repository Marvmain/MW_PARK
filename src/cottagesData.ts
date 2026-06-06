import { Cottage } from './types';

export const COTTAGES_DATA: Cottage[] = [
  {
    id: 'cot_canopy',
    name: 'Riverfront Canopy Cabana',
    type: 'Deluxe Stilt Cabana',
    tagline: 'Suspended over the river currents with matching overwater hammock nets.',
    description: 'An over-the-water elevated sanctuary crafted with local premium high-grade split bamboo, coco-lumber supports, and native cogon roofing.',
    longDescription: 'Positioned right over the bubbling river rapids, the Riverfront Canopy Cabana is the crown jewel of our Pandan watershed retreat. It stands on premium timber pillars 1.8 meters above river level to respect the seasonal rise and fall of the Dumagat River currents. The highlights include a direct overwater hammock net suspended on premium nautical cables where you can float directly above the crystalline riverwaters, comfortable floor cushions, solar-powered lighting, and an independent private stairs descend right into the cascading cooling water.',
    capacity: 'Up to 6 Guests max',
    ratePerDay: 1500,
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    amenities: [
      'Built-in premium overwater hammock net (2.5m x 2.2m)',
      'Dual solar USB fast-charging ports (5V/2.4A)',
      'Traditional rattan lounging chairs with native textile cushions',
      'Freshwater shower station positioned right on the staircase landing',
      'Complimentary thermo-insulated jug with cool mountain spring water'
    ],
    ecologicalSpecs: [
      'Constructed with 100% sustainable local bamboo and coco-lumber elements',
      'Solar-reliant active system keeping zero carbon footprint in the retreat zone',
      'Treated exclusively with organic bee-wax sealer to prevent river oil contamination'
    ],
    builtFrom: 'Native Pandan Bamboo & Dried Thatch Cogon Grass',
    stiltHeight: '1.8 Meters above active riverbed'
  },
  {
    id: 'cot_lodge',
    name: 'Dumagat Stilt Lodge',
    type: 'Premium Family Pavilion',
    tagline: 'Expansive twin-level pavilion deck built for families and corporate events.',
    description: 'A structural masterpiece using massive volcanic-hardened tree pillars, raw mahogany logs, and high-pitch nipa layers.',
    longDescription: 'The Dumagat Stilt Lodge is specifically designed for multi-generation tourist groups or intense adventure teams. This spacious two-tier pavilion faces the sweeping curve of the river rapids, giving unparalleled scenic vistas. The ground level features a long hand-carved mahogany banquet table, dedicated brick barbecue fire pits conforming to environmental smoke guidelines, and heavy nipa shade borders. The upper loft offers a fully carpeted tatami bamboo mat floor layout perfect for relaxing, dynamic viewfinding, and safety briefing.',
    capacity: 'Up to 12 Guests max',
    ratePerDay: 2800,
    image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
    amenities: [
      'Twin-level viewing layouts with panoramic landscape sightlines',
      'Heavy-duty hand-hewn mahogany long banquet deck table (12-seater)',
      'Private eco-compliant stone barbecue grill station (organic coconut shell charcoal provided)',
      'Triple high-power solar USB ports and LED overhead lanterns',
      'Spacious storage lockers with combination keyless locks'
    ],
    ecologicalSpecs: [
      'Sturdy foundations raised on high-tensile pile pillars to clear historic flood limits',
      'Equipped with strict biodegradable organic waste disposal systems',
      'Zero synthetic paint or plastic reinforcement used throughout construction'
    ],
    builtFrom: 'Mahogany Logs, Coco-Timber, and Triple-Woven Nipa Leaves',
    stiltHeight: '2.5 Meters above river bank level'
  },
  {
    id: 'cot_treehouse',
    name: 'Forest Canopy Treehouse',
    type: 'Adventure Couples Pod',
    tagline: 'Hidden panoramic pod suspended high in ancient riverbank mango canopy.',
    description: 'A cozy elevated hexagonal loft anchored into ancient riverbank mango trees, ideal for couples or micro teams.',
    longDescription: 'Wake up to the sounds of high-altitude forest birds and the rush of the river water beneath. Accessible via an incredibly fun secure spiral suspension wooden bridge, this cozy, romantic tree pavilion is constructed on the living trunk systems of three majestic century-old mango trees. Featuring dual woven rattan hanging cocoon chairs, high-pitch mosquito curtains, a dynamic cargo-pulley basket system for room service water and snacks, and beautiful night-sky tracking layouts.',
    capacity: 'Up to 4 Guests max',
    ratePerDay: 2000,
    image: 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?auto=format&fit=crop&w=800&q=80',
    amenities: [
      'Twin hanging egg swing chairs made of authentic natural rattan',
      'High-grade mosquito netting and organic canvas privacy drop curtains',
      'Fun manual rope-and-pulley supply basket for direct river-level beverage requests',
      'Rechargeable portable camping fans with integrated emergency flashlights',
      'Panoramic telescope for viewing rare local bird species on the watershed'
    ],
    ecologicalSpecs: [
      'Suspended with dynamic non-invasive steel tree-hugger straps to preserve bark life',
      'Zero nail penetration into living tree systems to ensure organic structural health',
      'Requires guests to packing-out all synthetic wraps to protect tree-dwelling fauna'
    ],
    builtFrom: 'Century Mango Tree Support, Red Lauan Wood, and Anahaw Roof Palm',
    stiltHeight: '4.5 Meters high into the tropical canopy'
  },
  {
    id: 'cot_shelter',
    name: 'Pandan Bamboo Shelter',
    type: 'Standard Day-Trip Cottage',
    tagline: 'Perfect classic bamboo hut positioned close to shallow wading coves.',
    description: 'A reliable, classic nipa-bamboo hut facing the soft white-sand river bays, ideal for relaxing day travelers.',
    longDescription: 'For those seeking the quintessential Filipino riverside cottage experience. Simple, highly durable, and very breezy, the Pandan Bamboo Shelter is located just steps from our shallow lagoon pools where children swim. Features include a classic bamboo slat floor (which stays naturally cool), a swinging woven hammock suspended beneath a shade tree, direct sandy riverfront beach path entry, and classic bench seating.',
    capacity: 'Up to 5 Guests max',
    ratePerDay: 800,
    image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
    amenities: [
      'Classic handmade hand-woven abaca hammock',
      'Full bamboo slat picnic table with wrap-around integrated bench seats',
      'Dedicated food prep station with pre-cleaned stone washing basin',
      'Complimentary waterproof gear chest (50L capacity) for guest belongings',
      'Immediate access to the main riverfront lifeguarded sandbars'
    ],
    ecologicalSpecs: [
      'Crafted using local wild-harvested culms of structural bamboo',
      'Features high-aeration bamboo slat flooring reducing wind shear and heat transfer',
      'Strictly prohibits use of disposable single-use plastics within the sandy cove bounds'
    ],
    builtFrom: 'Pandan Bamboo, Sawali (woven bamboo walls), and Nipa Thatch',
    stiltHeight: '0.5 Meters above sandy shoreline level'
  }
];
