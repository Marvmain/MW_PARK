import { Activity } from './types';

export const ACTIVITIES_DATA: Activity[] = [
  {
    id: 'act_kawa_spa',
    name: 'Kawa Spa',
    tagline: 'Relax in a traditional heated kawa bath by the river.',
    description: 'Soak in a classic Filipino kawa (cauldron) spa experience with warm water and natural riverside views.',
    longDescription: 'Our Kawa Spa lets guests unwind in handcrafted heated kawa tubs set along the Pandan riverfront. Choose a small kawa for intimate sessions or a big kawa for groups. Perfect after a day of water activities.',
    duration: '45–60 Minutes',
    difficulty: 'Easy',
    ageRequirement: 'All ages with adult supervision',
    adultRate: 350,
    childRate: 500,
    primaryRateLabel: 'Small',
    secondaryRateLabel: 'Big',
    image: 'https://scontent.fcgy2-4.fna.fbcdn.net/v/t39.30808-6/711249130_1318556340417001_7944872399149604403_n.jpg?stp=dst-jpg_tt6&cstp=mx1080x1440&ctp=s1080x1440&_nc_cat=110&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeGlEZADHRtJ72pGA8tELaK_kP9t96WN-WGQ_233pY35YS5yyrP_g5HJtZa4zeobQIDausmqkhgFVxYCRWyEaBWY&_nc_ohc=ZQuvtFklMy8Q7kNvwE9Q7kd&_nc_oc=AdpQ02yac8IC0kch6zBGbjW78YgV9ggStEgCDTxlFBoxiiEgkPqLRyZF0xvC9ATCanyPLCvoagreWdWkMAg5XSA5&_nc_zt=23&_nc_ht=scontent.fcgy2-4.fna&_nc_gid=Cq7eIU8xqKJNFPaymNJIQw&_nc_ss=7b2a8&oh=00_Af8OrWv8mXg6w2kMi6q0pHbGxJ9REfIIkfT-tHUr5TUMRQ&oe=6A29F64E',
    highlights: [
      'Small kawa (₱350) for 1–2 guests',
      'Big kawa (₱500) for groups',
      'Heated soak with riverside ambiance',
      'Towels and changing area available'
    ],
    safetyGuidelines: [
      'Check water temperature before entering.',
      'Children must be accompanied by an adult.',
      'Avoid the spa if you have open wounds or skin sensitivities.',
      'Limit soak time as advised by staff.'
    ],
    equipmentProvided: [
      'Heated kawa tub',
      'Towel',
      'Changing area access'
    ],
    bestTime: '10:00 AM – 04:00 PM'
  },
  {
    id: 'act_fish_spa',
    name: 'Fish Spa',
    tagline: 'Natural fish nibbling therapy for tired feet.',
    description: 'A one-hour fish spa session where gentle fish help exfoliate and refresh your feet.',
    longDescription: 'Sit back and dip your feet into our clean fish spa pools. Small fish naturally exfoliate dead skin while you relax by the water. Rate is per head for a full one-hour session.',
    duration: '1 Hour',
    difficulty: 'Easy',
    ageRequirement: 'Min. age 5 years',
    adultRate: 150,
    childRate: 150,
    primaryRateLabel: 'Per Head',
    secondaryRateLabel: 'Per Head',
    image: 'https://static.tripzilla.ph/media/115403/conversions/99093_800x-w768.webp',
    highlights: [
      '₱150 per head for 1 hour',
      'Natural exfoliation experience',
      'Relaxing riverside seating',
      'Great add-on after kayaking or tubing'
    ],
    safetyGuidelines: [
      'Feet must be washed before entering the pool.',
      'Do not enter if you have foot infections or open cuts.',
      'Remain seated and follow staff instructions.',
      'Session duration is limited to one hour per booking.'
    ],
    equipmentProvided: [
      'Fish spa pool access',
      'Foot wash station',
      'Lounge seating'
    ],
    bestTime: '09:00 AM – 05:00 PM'
  },
  {
    id: 'act_kayak',
    name: 'Kayak',
    tagline: 'Paddle the calm and scenic river channels.',
    description: 'Rent a single or double kayak and explore the Pandan river at your own pace.',
    longDescription: 'Choose a single kayak for solo paddling or a double kayak for pairs. Life guidance is available at the launch point. Ideal for beginners and families on calm river sections.',
    duration: '1–2 Hours',
    difficulty: 'Moderate',
    ageRequirement: 'Min. age 8 years for single; 5+ with adult in double',
    adultRate: 200,
    childRate: 350,
    primaryRateLabel: 'Single',
    secondaryRateLabel: 'Double',
    image: 'https://scontent.fcgy2-2.fna.fbcdn.net/v/t39.30808-6/709449524_27614482554826519_86063211436610131_n.jpg?stp=cp6_dst-jpg_tt6&cstp=mx1536x2048&ctp=s1536x2048&_nc_cat=104&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeFy7DbSUGuubQZnZ18X6tRS_J6c54IKPUf8npznggo9R0BaNYSe538Nv4WM1fOZTU73jikGZoFxFZ67ML8c50yO&_nc_ohc=r_eaBQXriAsQ7kNvwHB0kJx&_nc_oc=AdrdIHh10ZgHTPUwn5QVOc4znHCDs85YYzldiNZ-L8QmX-wRIGaTPtqlv4wIb1Bg9t5Kq8SIeN6bA-qZ3byMW5o2&_nc_zt=23&_nc_ht=scontent.fcgy2-2.fna&_nc_gid=yHBthVWX_e7lO_8foL9Heg&_nc_ss=7b2a8&oh=00_Af8Z5yuYYXMpUyFIhmSW6lfHwYMLF1Jk-1VyOp5UysYydg&oe=6A29E808',
    highlights: [
      'Single kayak — ₱200',
      'Double kayak — ₱350',
      'Stable sit-on-top vessels',
      'Scenic paddle routes along the river'
    ],
    safetyGuidelines: [
      'Life vest required at all times on the water.',
      'Stay within marked paddling zones.',
      'Return equipment by the agreed time.',
      'Basic swimming ability recommended for single kayaks.'
    ],
    equipmentProvided: [
      'Single or double kayak',
      'Paddle',
      'Life vest'
    ],
    bestTime: '08:00 AM – 03:00 PM'
  },
  {
    id: 'act_tub_rent',
    name: 'Tub Rent',
    tagline: 'Float and drift along the gentle river current.',
    description: 'Rent a river tube for a fun, relaxing float down the water.',
    longDescription: 'Grab a heavy-duty river tube and enjoy a leisurely float. Perfect for cooling off on hot days. Tub rental is a flat rate per tube.',
    duration: '1 Hour',
    difficulty: 'Easy',
    ageRequirement: 'Min. age 5 years with adult',
    adultRate: 50,
    childRate: 50,
    primaryRateLabel: 'Per Tube',
    secondaryRateLabel: 'Per Tube',
    image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjCuASeuE-H5-cTxGhlc6GL3_Xaj7hM5D_54EpsQ9y94Ok8KRYu8kCGnBkVd9Hmka3mRiwDvhEA9k6HRYEaZniiNvhuOZxvRW0aHioprAKTb_QTxA7B6OS_dzcoVLdFhx6UZ_Ynh-VcSaY/s1600/PANDAN+TO+BORACAY-0233.jpg',
    highlights: [
      '₱50 per tube',
      'Easy river float experience',
      'Family-friendly activity',
      'Combine with kayak for a full river day'
    ],
    safetyGuidelines: [
      'Wear a life vest while on the water.',
      'Follow staff directions for entry and exit points.',
      'One person per tube unless staff approves otherwise.',
      'Return tubes on time to avoid extra charges.'
    ],
    equipmentProvided: [
      'River tube',
      'Optional life vest'
    ],
    bestTime: '10:00 AM – 04:00 PM'
  },
  {
    id: 'act_life_vest_rent',
    name: 'Life Vest Rent',
    tagline: 'Extra flotation gear for your river activities.',
    description: 'Rent an additional life vest for guests who need extra safety equipment on the water.',
    longDescription: 'Standard life vest rental for use during kayaking, tubing, or other water activities. Ensures every guest has proper flotation while enjoying the park.',
    duration: 'Per activity session',
    difficulty: 'Easy',
    ageRequirement: 'All ages',
    adultRate: 50,
    childRate: 50,
    primaryRateLabel: 'Per Vest',
    secondaryRateLabel: 'Per Vest',
    image: 'https://scontent.fcgy2-2.fna.fbcdn.net/v/t51.82787-15/711738697_17994427652959529_9101698408211654653_n.jpg?stp=dst-jpg_tt6&cstp=mx1440x1800&ctp=s640x640&_nc_cat=109&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeHBtgP97xDZV79dB1PKsxISsR6WFaAC3YqxHpYVoALdiiq5D_dCrlOkSMKEsCrs7E2vNXoscyE5E5CZ0JFFQ5Bl&_nc_ohc=iw7shF_RmCsQ7kNvwF4X6iZ&_nc_oc=Adoh4vbGVzWhsyIkvIKlAKcEjn46a9sL9AFf4gqoLYSeZduqBBrWfXwkB192axjUAayPeFXQKaHxtLHqvoO6qY3h&_nc_zt=23&_nc_ht=scontent.fcgy2-2.fna&_nc_gid=5sKYw8VtpBv8UAPLv-bKUg&_nc_ss=7b2a8&oh=00_Af-GuFKS5KRL9hJ9EuR2IRqsoIPZ5X6vXE4BJiNgg_kYsg&oe=6A29E202',
    highlights: [
      '₱50 per vest',
      'Certified flotation devices',
      'Required for many water activities',
      'Multiple sizes available'
    ],
    safetyGuidelines: [
      'Vest must be properly fastened before entering water.',
      'Return vests dry and undamaged.',
      'Report damaged equipment to staff immediately.',
      'Do not remove vest while in the water.'
    ],
    equipmentProvided: [
      'Life vest (various sizes)'
    ],
    bestTime: 'Any time during park hours'
  },
  {
    id: 'act_spider_web',
    name: 'Spider Web',
    tagline: 'Climb and play on our giant rope spider web — free for all guests.',
    description: 'A fun rope climbing attraction included free with your park visit.',
    longDescription: 'The Spider Web is a large rope net structure for climbing, balancing, and play. It is free for all visitors and popular with kids and families. Staff supervision is available during peak hours.',
    duration: 'Unlimited (while park is open)',
    difficulty: 'Easy',
    ageRequirement: 'Children under 12 require adult supervision',
    adultRate: 0,
    childRate: 0,
    primaryRateLabel: 'Free',
    secondaryRateLabel: 'Free',
    image: 'https://scontent.fcgy2-2.fna.fbcdn.net/v/t39.30808-6/714759256_4422657201310788_4993385344900131654_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x2048&ctp=s2048x2048&_nc_cat=104&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeErd_kE8ugbRRGkB7ndfuJ_xCGnTHhuZHPEIadMeG5kc8-WA5SS3LU6A1mE7OF9DIeLY2efGHZM9rlSNtusAXCy&_nc_ohc=PftKYLScFw4Q7kNvwFxbSbu&_nc_oc=Adq6Xz2CMqlkyvbo6RmGnffD9A6EHBRXbtRwcy_K_Zt7SNwmkWXgF__ASj3DSPUH2Lyjjl_nLpht_CvswaInrjYT&_nc_zt=23&_nc_ht=scontent.fcgy2-2.fna&_nc_gid=hTNtBtuTZb5nXEt_YXTZcQ&_nc_ss=7b2a8&oh=00_Af_w1vgspEi9ExH8jcS6xWMxMcZBEbc1KtbtGK8xBhxqmA&oe=6A29F23F',
    highlights: [
      'Completely free',
      'Giant rope climbing net',
      'Great for kids and groups',
      'Photo-friendly attraction'
    ],
    safetyGuidelines: [
      'One climber per section when crowded.',
      'Remove shoes before climbing if requested by staff.',
      'Children must be supervised by an adult.',
      'No rough play or swinging into other guests.'
    ],
    equipmentProvided: [
      'Spider web rope structure',
      'Ground safety padding'
    ],
    bestTime: '08:00 AM – 05:00 PM'
  }
];
