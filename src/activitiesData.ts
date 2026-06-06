import { Activity } from './types';

export const ACTIVITIES_DATA: Activity[] = [
  {
    id: 'act_trekking',
    name: 'Dumagat River Trekking',
    tagline: 'Chasing pristine cascades along ancient watershed trails.',
    description: 'A guided eco-trek through the lush rainforest borders of Pandan, following the crystalline headwaters of the Dumagat River system.',
    longDescription: 'Our signature mountain-river trek offers an immersive descent into the wilderness of Antique. You will traverse bamboo canopy bridges, swim across deep volcanic chambers, and scramble up limestone cascades under the strict supervision of our certified forestry guides. This ecological trail emphasizes local flora education, low-impact travel, and historical local lore of the Panay highlands.',
    duration: '3.5 Hours',
    difficulty: 'Moderate',
    ageRequirement: 'Min. Age 8 years',
    adultRate: 350,
    childRate: 175,
    image: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=800&q=80',
    highlights: [
      'Guided scramble through limestone gorges and ancient boulders',
      'Informative walk highlight local ecosystem and rare wild orchids',
      'Refreshing swim inside natural river water chambers and waterfalls',
      'Traditional native snack served on banana leaves halfway'
    ],
    safetyGuidelines: [
      'Helmets and dual-strap river shoes must be worn at all times coordinate by safety crew.',
      'Always follow the exact step coordinates highlighted by your lead pathfinder.',
      'Do not consume food near active water streams to avoid ecological contamination.',
      'Recommended for guests with standard lower-limb mobility and cardiovascular stamina.'
    ],
    equipmentProvided: [
      'ANSI-certified climbing helmet',
      'Neoprene personal flotation device (PFD)',
      'Waterproof gear pouch (10L)',
      'High-traction river crossing walking staff'
    ],
    bestTime: '08:00 AM - 12:30 PM (Optimal high-visibility daylight)'
  },
  {
    id: 'act_kayak_tubing',
    name: 'Kayaking & Tubing',
    tagline: 'Ride the dynamic river curls on single-operator vessels.',
    description: 'An exhilarating whitewater floating run featuring active rapid zones and slow-drift botanical corridors of Pandan.',
    longDescription: 'Take complete command of your navigation or float suspended in safety-certified heavy-duty heavy chamber river tubes. Guided by river safety experts, this adventure puts you right in contact with the river flow. You will steer through grade I and II rapids, navigate twisting channels, and cool off as the Dumagat river slows down into premium crystalline wading basins.',
    duration: '2 Hours',
    difficulty: 'Challenging',
    ageRequirement: 'Min. Age 12 years',
    adultRate: 500,
    childRate: 300,
    image: 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?auto=format&fit=crop&w=800&q=80',
    highlights: [
      'High-adrenaline runs through active whitewater rapid zones',
      'Drift zones through stunning cathedral-like green vine tunnels',
      'Instructional clinic covering proper paddle and vessel control parameters',
      'Wading sessions in secluded, tranquil limestone river coves'
    ],
    safetyGuidelines: [
      'Participants must wear fastened personal flotation devices at all levels of navigation.',
      'Keep secure hold on your paddle leash; never drop paddles during whitewater sections.',
      'Active physical capability of swimming is highly recommended for individual kayak operators.',
      'Remain seated inside the tube outline when navigating rapid drop boundaries.'
    ],
    equipmentProvided: [
      'Ergonomic sit-on-top single kayak or heavy-duty reinforced river tube',
      'High-impact carbon fiber double-bladed paddle',
      'Dynamic security rescue beacon link',
      'Type-IV specialized flotation vest and water helmet'
    ],
    bestTime: '10:30 AM - 03:30 PM (Warmer river water thermal temperatures)'
  },
  {
    id: 'act_waterpark',
    name: 'Waterpark Day Pass',
    tagline: 'Casual riverfront recreation and natural swimming corridors.',
    description: 'Unlimited access to the manicured ecological pools, vine swings, and riverside dining cabanas.',
    longDescription: 'For families and travelers seeking a peaceful commune with the river without heavy elevation shifts. The Waterpark region features pristine river sandbars, wooden diving boards, bamboo sunbeds, and crystal-clear wading zones perfect for children. Indulge in authentic local dining within our high-comfort stilt cottages overlooking the river currents.',
    duration: 'Full Day (08:00 AM - 05:00 PM)',
    difficulty: 'Easy',
    ageRequirement: 'Seniors & Children allowed with guardians',
    adultRate: 250,
    childRate: 150,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    highlights: [
      'Access to premium natural spring pools and riverfront boardwalks',
      'Unlimited use of the famous 4-meter Pandan forest vine swing',
      'Comfortable bamboo cottages and shaded riverfront tables',
      'Wading paths and children flotation rings managed by active lifeguards'
    ],
    safetyGuidelines: [
      'Children must be supervised by an adult at all times when wading in main currents.',
      'Life jackets are available for rent or use for less experienced swimmers.',
      'Strictly do not bring glass containers near the pool structures for safety continuity.',
      'No swimming in designated deep conservation sectors marked with red surface buoys.'
    ],
    equipmentProvided: [
      'Secure locker space pass',
      'Complimentary bamboo lounge chair access',
      'Standard light flotation tube (available upon request)'
    ],
    bestTime: '08:00 AM - 05:00 PM (Flexible schedule options)'
  },
  {
    id: 'act_bamboo_raft',
    name: 'Extreme Bamboo Rafting',
    tagline: 'Traditional mountain-river navigation with expert masters.',
    description: 'An elite traditional team activity on heavy timber rafts built for intense team cooperation.',
    longDescription: 'Authentic wild river navigation aboard traditional heavy bamboo rafts hand-assembled by local craftsmen. Guided by two expert river captains, teams of 4 to 8 guests must synchronize their efforts to steer these massive, buoyant structures through narrow limestone corridors and intense river drop passages. An absolute masterclass in heritage teamwork and wild exploration.',
    duration: '2.5 Hours',
    difficulty: 'Extreme',
    ageRequirement: 'Min. Age 14 years',
    adultRate: 600,
    childRate: 400,
    image: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80',
    highlights: [
      'High-coordination maneuvers on 15-meter reinforced heritage bamboo rafts',
      'Tackle intense grade III river drop rapids with master sweeps',
      'Deep-water diving off secure high limestone platform stations',
      'Sumptuous traditional grilled boodle fight feast served local-style'
    ],
    safetyGuidelines: [
      'Severe physical restrictions apply. Cardiac, skeletal, or heavy asthma cases are barred.',
      'Always listen immediately to the tactical audio counts given by your lead sweep guide.',
      'Brace with feet inside the secure foot-strap cords during drop corridors.',
      'Waiver signature requires strict verification of date of birth and emergency details.'
    ],
    equipmentProvided: [
      'Premium reinforced bamboo raft (dual-guide sweep configuration)',
      'Specialized high-buoyancy guide certified jacket',
      'Impact-resistant helmet',
      'Heavy duty quick-release team rescue safety lines'
    ],
    bestTime: '08:00 AM or 01:30 PM (Consistent optimal river current volumes)'
  }
];
