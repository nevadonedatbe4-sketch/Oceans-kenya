export interface ComparisonDimension {
  rating: number;
  description: string;
  note?: string;
}

export interface NeighbourhoodComparison {
  slug: string;
  name: string;
  tagline: string;
  safety: ComparisonDimension;
  vibe: string;
  bestFor: string[];
  pros: string[];
  cons: string[];
  priceRange: string;
  rentalRange: string;
  typicalRent1BR: string;
  walkability: ComparisonDimension;
  nightlife: ComparisonDimension;
  familyFriendliness: ComparisonDimension;
  greenSpace: ComparisonDimension;
  valueForMoney: ComparisonDimension;
  prestige: ComparisonDimension;
  accessibility: ComparisonDimension;
  rentalYield: ComparisonDimension;
  schoolAccess: ComparisonDimension;
  healthAccess: ComparisonDimension;
  verdict: string;
}

export const comparisonData: NeighbourhoodComparison[] = [
  {
    slug: 'karen',
    name: 'Karen',
    tagline: 'Nairobi\'s Timeless Green Enclave',
    safety: {
      rating: 5,
      description: 'Widely regarded as one of the safest and most secure residential suburbs in Nairobi. Low-density estate living, gated compounds with manned gatehouses, private security patrols, and a quieter suburban feel all reduce opportunistic crime. Fewer street-level incidents reported than urban neighbourhoods.',
      note: 'Safest overall among Nairobi suburbs — ideal for families and diplomats',
    },
    vibe: 'Serene, upscale, nature-oriented — the benchmark for quiet luxury living',
    bestFor: ['Families wanting space and security', 'Diplomats and senior executives', 'Wildlife and nature enthusiasts', 'Long-term residents prioritising privacy', 'Luxury buyers seeking large plots'],
    pros: [
      'Unmatched green space and tree cover — bordering Nairobi National Park',
      'Elite international schools within 5–10 minutes',
      'The Hub Karen and Waterfront provide excellent shopping and family recreation',
      'Gated communities and private security deliver top-tier safety',
      'Strong price appreciation (3.8–4.2% quarterly) and stable investment',
    ],
    cons: [
      'Farthest of the premium suburbs from the CBD — 15km, 30–60+ minute commutes',
      'Limited walkability outside compounds — car-dependent',
      'Fewer nightlife and dining options than Kilimani or Westlands',
      'Highest entry price point — out of reach for most first-time buyers',
      'Limited public transport options',
    ],
    priceRange: 'KES 35M – 245M+',
    rentalRange: 'KES 250,000 – 650,000/month',
    typicalRent1BR: 'KES 80,000 – 120,000',
    walkability: {
      rating: 2,
      description: 'Car-dependent suburb — compounds are walkable within their gates, but getting to shops, schools, or restaurants almost always requires a vehicle. No continuous pedestrian infrastructure between estates.',
    },
    nightlife: {
      rating: 2,
      description: 'Quiet — Karen is not a nightlife destination. Evening socialising happens at private residences, country clubs, or restaurants like Talisman. For nightlife, residents head 20–30 minutes to Kilimani or Westlands.',
    },
    familyFriendliness: {
      rating: 5,
      description: 'Arguably Nairobi\'s best family suburb. Large compounds with gardens, top-tier international schools, abundant green space, wildlife attractions, and family-oriented malls. The low-traffic, quiet streets are ideal for children.',
      note: 'Best-in-class for families',
    },
    greenSpace: {
      rating: 5,
      description: 'Unrivalled green cover — bordering Nairobi National Park, home to indigenous forest, the Karen Blixen Museum gardens, Oloolua Nature Trail, and the Giraffe Centre. Most compounds have mature trees and large gardens.',
      note: 'Nairobi\'s greenest suburb',
    },
    valueForMoney: {
      rating: 3,
      description: 'You pay a premium for the Karen lifestyle. Per-square-metre prices are among Nairobi\'s highest. The value lies in space, privacy, and appreciation — not affordability. Land values appreciate ~10–15% annually, rewarding long-term buyers.',
    },
    prestige: {
      rating: 5,
      description: 'One of Nairobi\'s most prestigious addresses — synonymous with old money, diplomatic families, and established wealth. A Karen address carries significant social cachet.',
    },
    accessibility: {
      rating: 3,
      description: '15km from CBD. Ngong Road and Langata Road are the main arteries — both can be heavily congested during rush hour. The planned Ngong Road dualling should improve matters. Limited public transport; Uber/Bolt are reliable but expensive from Karen.',
    },
    rentalYield: {
      rating: 3,
      description: 'Diplomatic and executive demand keeps rental yields moderate at 4–5%. The high property values mean yields are lower than urban areas, but rental income is extremely stable with near-zero vacancy for quality properties.',
    },
    schoolAccess: {
      rating: 5,
      description: 'Brookhouse, Hillcrest, The Banda School, and Netherlands School Society all within Karen\'s borders. Arguably Nairobi\'s best concentration of elite international schools.',
      note: 'Best school access in Nairobi',
    },
    healthAccess: {
      rating: 4,
      description: 'Karen Hospital and several private clinics within 10 minutes. Nairobi Hospital is 20–25 minutes away. Good coverage for routine and emergency care, though specialist care may require travel to the CBD.',
    },
    verdict: 'The ultimate family and luxury suburb — unmatched green space, safety, and schools. You trade proximity to the CBD and nightlife for space, privacy, and a genuinely serene lifestyle. Best suited to buyers and renters who prioritise quality of life over urban energy.',
  },
  {
    slug: 'westlands',
    name: 'Westlands',
    tagline: 'Nairobi\'s Commercial & Nightlife Capital',
    safety: {
      rating: 4,
      description: 'Reasonably safe, especially for a busy urban/commercial district. Malls (Westgate, Sarit Centre) have security checks, high foot traffic provides passive surveillance, and private security is visible in key spots. UN and expat presence contributes to better policing. Generally safe during the day and early evening.',
      note: 'Denser nightlife increases risks later at night — stick to well-lit, populated areas',
    },
    vibe: 'Cosmopolitan, fast-paced, and electric — Nairobi\'s most exciting urban district by day and night',
    bestFor: ['First-time visitors to Nairobi', 'Young professionals and corporate executives', 'Nightlife and dining enthusiasts', 'Investors seeking highest rental yields', 'Short-stay business travellers'],
    pros: [
      'Nairobi\'s best nightlife and dining scene — Alchemist, Brew Bistro, rooftop bars',
      'Highest rental yields in Nairobi (7–10%) driven by corporate and expat demand',
      'Excellent walkability by Nairobi standards — malls, offices, restaurants all walkable',
      'Major corporate HQs and co-working spaces make it the business hub',
      'Good security in compounds and malls with visible policing',
    ],
    cons: [
      'Noisy — the trade-off for urban energy is constant activity and traffic',
      'More expensive than most neighbourhoods for equivalent space',
      'Higher petty crime risk than gated suburbs, especially at night near entertainment areas',
      'Limited green space — Karura Forest and Arboretum are 10–15 minutes away',
      'Traffic-heavy during peak hours on Waiyaki Way',
    ],
    priceRange: 'KES 36M – 104M',
    rentalRange: 'KES 200,000 – 650,000/month',
    typicalRent1BR: 'KES 60,000 – 100,000',
    walkability: {
      rating: 5,
      description: 'Nairobi\'s most walkable neighbourhood. Sarit Centre, Westgate, offices, restaurants, and bars are all within 10–15 minutes on foot. Good pavements in the commercial core, though some side streets lack pedestrian infrastructure.',
      note: 'Best walkability in Nairobi',
    },
    nightlife: {
      rating: 5,
      description: 'The undisputed nightlife capital. Alchemist, Brew Bistro, K1 Klub House, Galileo Lounge, B-Club, and dozens of rooftop bars. Everything from craft cocktails to live music to nightclubs — Westlands is where Nairobi comes alive after dark.',
      note: 'Nairobi\'s #1 nightlife destination',
    },
    familyFriendliness: {
      rating: 2,
      description: 'Not built for families — limited green space, noise, and the nightlife focus make it less suitable for children. Few families with young children choose Westlands as their primary residence. Better suited to singles and couples.',
    },
    greenSpace: {
      rating: 2,
      description: 'Limited — Karura Forest (15 minutes) and Arboretum (10 minutes) require a drive. Most towers offer rooftop gardens and pools to compensate for the lack of ground-level green space.',
    },
    valueForMoney: {
      rating: 3,
      description: 'You pay a premium for location and lifestyle, not space. Price per square metre is high, but rental yields offset this for investors. The value proposition is access and energy — not square footage.',
    },
    prestige: {
      rating: 4,
      description: 'A Westlands address signals urban sophistication and professional success — different from Karen\'s old-money prestige but equally desirable in corporate and social circles.',
    },
    accessibility: {
      rating: 5,
      description: 'Unbeatable — minutes from the CBD, on the main Waiyaki Way corridor, and the expressway has dramatically improved connectivity. Best public transport links in the city. Uber/Bolt are plentiful and affordable for short trips.',
      note: 'Most accessible neighbourhood in Nairobi',
    },
    rentalYield: {
      rating: 5,
      description: 'The city\'s highest at 7–10%. Corporate demand, short-term diplomatic lets, and the startup/tech ecosystem drive consistently strong rental returns. Vacancy rates are low for well-located, quality apartments.',
      note: 'Highest rental yields in Nairobi',
    },
    schoolAccess: {
      rating: 3,
      description: 'Decent but not exceptional. Oshwal Academy, Aga Khan Academy, and Braeburn are nearby in Parklands. Most families in Westlands send children to schools in Parklands, Gigiri, or Runda (15–20 minute drive).',
    },
    healthAccess: {
      rating: 5,
      description: 'Excellent — Aga Khan University Hospital (10 minutes), MP Shah Hospital, Avenue Hospital Westlands, and numerous private clinics and specialist centres within walking distance.',
      note: 'Best health access in Nairobi',
    },
    verdict: 'The ultimate urban lifestyle destination — unbeatable for nightlife, dining, walkability, and investment returns. You trade quiet and green space for the city\'s most exciting energy. Best suited to young professionals, investors, and anyone who wants to be at the centre of Nairobi\'s action.',
  },
  {
    slug: 'kilimani',
    name: 'Kilimani',
    tagline: 'Nairobi\'s Cosmopolitan Heart',
    safety: {
      rating: 4,
      description: 'Generally safe with good building-level security — most apartments have 24/7 guards, CCTV, and biometric access. Street-level safety requires urban awareness, especially at night. The high foot traffic and busy commercial areas provide good passive surveillance during the day.',
    },
    vibe: 'Lively, cosmopolitan, and social — the sweet spot between Westlands\' intensity and the quieter residential suburbs',
    bestFor: ['Digital nomads and remote workers', 'Foodies and social butterflies', 'Young professionals seeking walkability', 'Mid-range buyers and renters', 'Those wanting urban energy with residential comfort'],
    pros: [
      'Best walkability after Westlands — cafes, co-working, and malls within walking distance',
      'Excellent dining scene — Cultiva, Fonda NBO, Hero, Mama Rocks',
      'More affordable than Westlands for equivalent space',
      'Strong social scene with rooftop bars and weekend brunch culture',
      'Good building-level security and access control',
    ],
    cons: [
      'Increasing density — new towers are changing the neighbourhood character',
      'Traffic congestion on Ngong Road and Argwings Kodhek during peak hours',
      'Limited green space — most parks require a short drive',
      'Street-level safety requires caution at night',
      'Noise from construction and nightlife can be an issue in some pockets',
    ],
    priceRange: 'KES 33M – 98M',
    rentalRange: 'KES 180,000 – 550,000/month',
    typicalRent1BR: 'KES 45,000 – 75,000',
    walkability: {
      rating: 4,
      description: 'Very walkable — Yaya Centre, Junction Mall, and dozens of cafes and restaurants are reachable on foot. Better pedestrian infrastructure than most Nairobi suburbs, though some side streets need improvement.',
    },
    nightlife: {
      rating: 4,
      description: 'Strong — K1 Klub House, Brew Bistro, Alchemist (short drive), and numerous lounges along Ngong Road. Weekend brunch parties are a Kilimani institution. More relaxed than Westlands but still vibrant.',
    },
    familyFriendliness: {
      rating: 3,
      description: 'Mixed — good for couples and families with older children. Riara School is excellent. The lack of large gardens and increasing density make it less ideal for families with young children compared to Karen or Lavington.',
    },
    greenSpace: {
      rating: 2,
      description: 'Limited — Arboretum (10 minutes) and Ngong Road Forest Sanctuary are the nearest options. Apartment complexes increasingly include rooftop gardens and small green courtyards.',
    },
    valueForMoney: {
      rating: 4,
      description: 'Strong value — significantly cheaper per square metre than Westlands while offering similar amenities and better residential comfort. First-time buyers get more space for their money.',
    },
    prestige: {
      rating: 3,
      description: 'Respectable and modern but not prestigious — Kilimani signals urban savvy rather than old money. Well-regarded among young professionals and the creative class.',
    },
    accessibility: {
      rating: 5,
      description: 'Excellent — central location provides easy access to the CBD, Westlands, and major highways. Ngong Road is the main artery. Multiple routes to avoid traffic. Uber/Bolt are plentiful.',
    },
    rentalYield: {
      rating: 4,
      description: 'Strong at 6–8%. High demand from young professionals and expats, though increased supply of new units is creating more competition. Well-located units with good amenities maintain premium rents.',
    },
    schoolAccess: {
      rating: 4,
      description: 'Good — Riara School is within walking distance, Braeburn and the French School are nearby. More limited than Karen or Gigiri for elite international options.',
    },
    healthAccess: {
      rating: 4,
      description: 'Good — Nairobi Hospital is 5 minutes away. Several private clinics and specialist centres along Ngong Road and within malls.',
    },
    verdict: 'The best all-rounder for urban living — more residential than Westlands but more exciting than the suburbs. Excellent walkability, dining, and social life at prices that don\'t break the bank. The ideal choice for young professionals and couples who want city energy without sacrificing comfort.',
  },
  {
    slug: 'lavington',
    name: 'Lavington',
    tagline: 'Refined Living at the City\'s Core',
    safety: {
      rating: 5,
      description: 'One of Nairobi\'s safest neighbourhoods. Gated estates with 24/7 security, active neighbourhood watch associations, and private security patrols. The quiet, established residential character and lower density contribute to a very secure environment.',
      note: 'Among Nairobi\'s safest residential areas',
    },
    vibe: 'Refined, established, and tranquil — old Nairobi at its most elegant',
    bestFor: ['Families with school-age children', 'Established professionals seeking quiet luxury', 'Those wanting central access without urban intensity', 'Buyers prioritising long-term appreciation', 'People who value established community over trendy hotspots'],
    pros: [
      'Consistent quarterly price appreciation — one of Nairobi\'s most stable markets',
      'Excellent schools — Riara, Strathmore, Braeside all within the area',
      'Top-tier safety with gated estates and active neighbourhood watch',
      'Beautiful tree-lined streets and established gardens',
      'Perfect balance of suburban peace and central access (CBD and Westlands both 10–15 minutes)',
    ],
    cons: [
      'Limited nightlife — quiet evenings, residents travel to Kilimani or Westlands for entertainment',
      'Fewer new developments than Kilimani — less inventory for buyers',
      'Higher price point than Kilimani or Kileleshwa for equivalent space',
      'Less walkable than Kilimani for cafes and amenities',
      'Older housing stock in some pockets requires renovation',
    ],
    priceRange: 'KES 46M – 117M',
    rentalRange: 'KES 220,000 – 600,000/month',
    typicalRent1BR: 'KES 55,000 – 90,000',
    walkability: {
      rating: 3,
      description: 'Moderate — Lavington Curve and some local shops are walkable from certain pockets, but the neighbourhood is primarily car-dependent. Tree-lined streets make for pleasant walks, just not practical commutes.',
    },
    nightlife: {
      rating: 2,
      description: 'Quiet and residential — a handful of cosy bars and restaurants like Pallet Cafe for evening dining, but no club scene. Kilimani and Westlands are both 10 minutes away for nightlife.',
    },
    familyFriendliness: {
      rating: 5,
      description: 'Excellent — top-tier schools, safe streets, established community, and a peaceful environment. Less green space than Karen but better central access. A perennial family favourite.',
      note: 'Superb for families',
    },
    greenSpace: {
      rating: 4,
      description: 'Good — Nairobi Arboretum borders Lavington, and the neighbourhood itself features beautiful mature trees and established gardens. More green than Kilimani or Westlands.',
    },
    valueForMoney: {
      rating: 3,
      description: 'Moderate — you pay for stability, safety, and schools. Per-square-metre prices are above Kilimani but below Karen. The consistent appreciation makes it a solid long-term investment despite the higher entry point.',
    },
    prestige: {
      rating: 4,
      description: 'Highly respected — a Lavington address signals established success. Less flashy than Karen but equally well-regarded in professional and diplomatic circles.',
    },
    accessibility: {
      rating: 4,
      description: 'Very good — 10–15 minutes to both the CBD and Westlands. James Gichuru Road and Muthangari Road provide multiple routes. Less congested than Ngong Road but can still be busy during peak hours.',
    },
    rentalYield: {
      rating: 3,
      description: 'Moderate at 4–5%. Lower than Kilimani or Westlands because property values are higher, but rental income is stable with strong demand from families and professionals.',
    },
    schoolAccess: {
      rating: 5,
      description: 'Superb — Riara School, Strathmore School, Braeside, and Lavington Primary all within the neighbourhood. Arguably the best concentration of quality schools after Karen.',
      note: 'Excellent school access',
    },
    healthAccess: {
      rating: 4,
      description: 'Good — Nairobi Hospital is 5–7 minutes away. Several private clinics and specialist centres along Muthangari and James Gichuru roads.',
    },
    verdict: 'The refined choice — Karen\'s sophistication with better central access. You sacrifice nightlife and new-development buzz for established elegance, top schools, and steady appreciation. Ideal for families and professionals who want peaceful, prestigious living without being far from the action.',
  },
  {
    slug: 'gigiri',
    name: 'Gigiri',
    tagline: 'The United Nations Quarter',
    safety: {
      rating: 5,
      description: 'Exceptional — among Nairobi\'s most secure areas. 24/7 police and private security patrols, embassy security infrastructure, controlled access points, and active neighbourhood watch. The UN and diplomatic presence elevates security far above typical Nairobi standards.',
      note: 'Arguably Nairobi\'s most secure neighbourhood',
    },
    vibe: 'International, secure, and well-planned — a diplomatic bubble with world-class amenities',
    bestFor: ['UN staff and international civil servants', 'Diplomats and embassy personnel', 'Families wanting maximum security', 'International NGO workers', 'Those who value a global, multicultural community'],
    pros: [
      'Nairobi\'s most secure neighbourhood — exceptional 24/7 security infrastructure',
      'Karura Forest on the doorstep — one of the world\'s best urban forests',
      'Outstanding international schools — ISK, Rosslyn Academy, German School',
      'Village Market is one of Nairobi\'s best shopping and dining destinations',
      'Stable diplomatic rental demand means near-zero vacancy for quality properties',
    ],
    cons: [
      'Expensive — diplomatic demand drives premium pricing for both purchase and rent',
      'More isolated — 20–25 minutes from the CBD and Westlands',
      'Quiet social scene — evening life centres on embassy functions and private dinners',
      'Limited inventory — properties rarely stay on the market long',
      'Less vibrant dining and nightlife than Westlands or Kilimani',
    ],
    priceRange: 'KES 52M – 143M',
    rentalRange: 'KES 250,000 – 700,000/month',
    typicalRent1BR: 'KES 70,000 – 110,000',
    walkability: {
      rating: 4,
      description: 'Good within Gigiri\'s planned core — Village Market, the UN compound, and some residential areas are connected by wide, well-maintained pavements. Less walkable once you exit the diplomatic zone.',
    },
    nightlife: {
      rating: 2,
      description: 'Quiet and diplomatic — a handful of upscale bars at Tribe Hotel and Village Market. Most socialising happens at embassy functions or private dinner parties. Westlands is 15–20 minutes for nightlife.',
    },
    familyFriendliness: {
      rating: 5,
      description: 'Superb — top international schools, unmatched security, Karura Forest for outdoor recreation, and a planned, clean environment. The diplomatic community provides a supportive, multicultural environment for children.',
      note: 'Excellent for international families',
    },
    greenSpace: {
      rating: 5,
      description: 'Outstanding — Karura Forest borders Gigiri with 50km of trails, waterfalls, and 200+ bird species. The neighbourhood itself features wide tree-lined boulevards and well-maintained green verges.',
      note: 'Best urban forest access in Nairobi',
    },
    valueForMoney: {
      rating: 2,
      description: 'Expensive — diplomatic demand inflates prices well above what you would pay for equivalent space in other suburbs. The premium is for security, exclusivity, and international amenities — not square footage.',
    },
    prestige: {
      rating: 5,
      description: 'Highly prestigious in international and diplomatic circles. A Gigiri address signals global connections and elite status — distinct from Karen\'s old-money prestige but equally powerful.',
    },
    accessibility: {
      rating: 3,
      description: 'Moderate — 20–25 minutes from the CBD. Limuru Road and the Northern Bypass are the main arteries. Less congested than southern suburbs but the distance is real. Limited public transport; Uber/Bolt are reliable.',
    },
    rentalYield: {
      rating: 4,
      description: 'Strong at 5–6%. Diplomatic demand creates near-guaranteed occupancy for quality properties. While yields are lower than Westlands, the stability and tenant quality are unmatched.',
    },
    schoolAccess: {
      rating: 5,
      description: 'World-class — International School of Kenya (ISK), Rosslyn Academy, Peponi School, and the German School are all within 10–15 minutes. Perhaps Nairobi\'s best concentration of elite international education.',
      note: 'World-class international schools',
    },
    healthAccess: {
      rating: 4,
      description: 'Good — Aga Khan University Hospital (10 minutes), Gertrude\'s Children\'s Hospital, UNON medical centre (for UN staff). Specialist care is accessible with a short drive.',
    },
    verdict: 'The diplomatic dream — unmatched security, world-class schools, and Karura Forest as your backyard. You pay a significant premium for the diplomatic bubble, but for those who need or value that environment, nothing else in Nairobi compares. The ultimate choice for international families and diplomatic personnel.',
  },
  {
    slug: 'muthaiga',
    name: 'Muthaiga',
    tagline: 'Kenya\'s Most Exclusive Address',
    safety: {
      rating: 5,
      description: 'Exceptional — Muthaiga has its own police post, 24/7 private security patrols, gated access points, and active neighbourhood surveillance. The concentration of ambassadorial residences and high-net-worth individuals means security is taken extremely seriously. Many compounds have additional private security detail.',
      note: 'Maximum security — on par with Gigiri, arguably more discreet',
    },
    vibe: 'Ultra-exclusive, historic, and impossibly private — old-world elegance meets billionaire discretion',
    bestFor: ['Ultra-high-net-worth individuals', 'Ambassadors and heads of mission', 'Old-money families and business dynasties', 'Buyers seeking maximum privacy and prestige', 'Those for whom budget is genuinely not a consideration'],
    pros: [
      'Nairobi\'s most prestigious address — unmatched social cachet',
      'Muthaiga Country Club — one of Africa\'s most storied private clubs',
      'Karura Forest as a de facto backyard extension',
      'Maximum privacy — compounds are hidden from view behind mature hedges and gates',
      'Properties rarely reach the open market — exclusivity by design',
    ],
    cons: [
      'Astronomical prices — the entry point excludes all but the ultra-wealthy',
      'Properties rarely available — the market is opaque and private',
      'Limited amenities within walking distance — entirely car-dependent',
      'Quiet, sometimes insular — not for those seeking urban energy',
      'Muthaiga Country Club has a waiting list and strict membership criteria',
    ],
    priceRange: 'KES 156M – 650M+',
    rentalRange: 'KES 500,000 – 2,000,000/month',
    typicalRent1BR: 'KES 90,000 – 150,000',
    walkability: {
      rating: 1,
      description: 'Not walkable — Muthaiga is designed for privacy and seclusion, not pedestrian access. No shops, cafes, or amenities within walking distance. The neighbourhood is entirely car-dependent.',
    },
    nightlife: {
      rating: 1,
      description: 'Virtually non-existent — this is deliberate. Social life is entirely private: the Country Club, dinner parties, and embassy functions. Residents who want nightlife drive to Westlands.',
    },
    familyFriendliness: {
      rating: 4,
      description: 'Excellent for families who value privacy and space — large compounds, quiet streets, and good nearby schools. Less community-oriented than Karen or Lavington due to the ultra-private culture.',
    },
    greenSpace: {
      rating: 5,
      description: 'Outstanding — Karura Forest borders the neighbourhood, Muthaiga Country Club grounds are essentially a botanical park, and most compounds feature extensive private mature gardens.',
    },
    valueForMoney: {
      rating: 1,
      description: 'The worst value in Nairobi by any rational metric — but value is not the point. You are paying for exclusivity, privacy, and prestige that no other neighbourhood can match. This is a trophy address.',
    },
    prestige: {
      rating: 5,
      description: 'The crown jewel — Muthaiga is Kenya\'s most prestigious address, period. Home to presidents, ambassadors, billionaires, and old-money dynasties. No other Nairobi neighbourhood carries comparable social weight.',
      note: 'Kenya\'s most prestigious address',
    },
    accessibility: {
      rating: 4,
      description: 'Surprisingly good for such an exclusive area — 15 minutes to the CBD, on the main Limuru Road and Kiambu Road corridors. Less congested than southern routes. But entirely car-dependent.',
    },
    rentalYield: {
      rating: 2,
      description: 'Low at 2–3% — property values are so high that even premium diplomatic rents cannot generate strong yields. Rental income is stable but the investment case rests on capital appreciation, not cash flow.',
    },
    schoolAccess: {
      rating: 4,
      description: 'Very good — Peponi School, ISK, and Rosslyn Academy are 10–15 minutes away. Not quite as convenient as Karen or Lavington for school runs, but access to elite schools is strong.',
    },
    healthAccess: {
      rating: 4,
      description: 'Good — Aga Khan University Hospital (10 minutes), Nairobi Hospital (15 minutes). Private concierge medical services are commonly used by residents.',
    },
    verdict: 'The ultimate trophy address — unmatched prestige, privacy, and old-money elegance. You need serious wealth just to enter the conversation, and even then, finding an available property is a challenge. For those who can, Muthaiga offers a lifestyle that exists nowhere else in East Africa. Not a value play — a legacy purchase.',
  },
  {
    slug: 'runda',
    name: 'Runda',
    tagline: 'Nairobi\'s Premier Diplomatic Enclave',
    safety: {
      rating: 5,
      description: 'Excellent — a purpose-built gated community with manned entry points, perimeter walls, CCTV, and 24/7 private security patrols. The concentration of diplomatic residences adds an additional layer of informal security. One of Nairobi\'s most secure residential areas.',
      note: 'Gated community security at its best',
    },
    vibe: 'Exclusive, manicured, and international — a planned diplomatic haven with contemporary luxury',
    bestFor: ['Diplomats and embassy staff', 'High-net-worth families', 'UN and international organisation personnel', 'Corporate executives', 'Those wanting a planned community with consistent standards'],
    pros: [
      'Purpose-built gated community with consistent quality standards',
      'Underground utilities — no overhead cables, clean streetscapes',
      'Wide, tree-lined boulevards designed for residential comfort',
      'Strong diplomatic and international community',
      'Good security with controlled access and patrols',
    ],
    cons: [
      'Expensive — premium pricing for both purchase and rent',
      'Limited amenities within the estate — must leave for shopping and dining',
      '20–25 minutes from the CBD — longer commute than central suburbs',
      'Less character than older neighbourhoods like Karen or Muthaiga',
      'HOA fees and estate regulations add ongoing costs and restrictions',
    ],
    priceRange: 'KES 85M – 325M',
    rentalRange: 'KES 450,000 – 1,200,000/month',
    typicalRent1BR: 'KES 75,000 – 100,000',
    walkability: {
      rating: 3,
      description: 'Moderate within the estate — wide boulevards with pavements make for pleasant walks, but there is nowhere to walk to. Shopping, dining, and amenities all require a car. Good for recreation, not errands.',
    },
    nightlife: {
      rating: 2,
      description: 'Quiet — Runda has no nightlife of its own. Village Market in Gigiri (10 minutes) has a handful of evening venues. For serious nightlife, Westlands is 20–25 minutes. Most social life is private.',
    },
    familyFriendliness: {
      rating: 4,
      description: 'Very good — secure, spacious compounds, good nearby schools (Peponi, ISK, Rosslyn), and a planned environment. Less green space than Karen or Muthaiga but more consistent infrastructure.',
    },
    greenSpace: {
      rating: 3,
      description: 'Moderate — individual compounds have gardens, and Karura Forest is 15 minutes away. Runda\'s planned boulevards include green verges, but there are no public parks within the estate.',
    },
    valueForMoney: {
      rating: 2,
      description: 'Expensive — you pay a significant premium for the gated community security and diplomatic cachet. Per-square-metre prices are below Muthaiga but well above most other suburbs.',
    },
    prestige: {
      rating: 5,
      description: 'Highly prestigious in diplomatic circles — a Runda address is essentially shorthand for diplomatic elite. Less historic than Muthaiga or Karen but equally respected in the international community.',
    },
    accessibility: {
      rating: 3,
      description: 'Moderate — 20–25 minutes from the CBD. The Northern Bypass has improved connectivity. Kiambu Road can be congested. Limited public transport; car-dependent.',
    },
    rentalYield: {
      rating: 3,
      description: 'Moderate at 4–5%. Diplomatic demand ensures stable occupancy, but high property values cap yield potential. Premium compounds command the strongest rents.',
    },
    schoolAccess: {
      rating: 4,
      description: 'Good — Peponi School, Potterhouse, ISK, and Rosslyn Academy are all 10–15 minutes away. Strong international school options, though not as densely concentrated as Karen.',
    },
    healthAccess: {
      rating: 4,
      description: 'Good — Aga Khan University Hospital (15 minutes), Gertrude\'s Children\'s Hospital, several private clinics in Gigiri.',
    },
    verdict: 'The diplomatic choice — Runda delivers gated-community security, consistent quality, and international community in a purpose-built package. It lacks the character of older neighbourhoods but compensates with infrastructure and planning. Ideal for diplomats and executives who want predictability and prestige without the ultra-premium of Muthaiga.',
  },
  {
    slug: 'kileleshwa',
    name: 'Kileleshwa',
    tagline: 'Hillside Living, Smart Investing',
    safety: {
      rating: 4,
      description: 'Good — most apartment complexes have 24/7 security, CCTV, and access control. The hillside location and residential character contribute to safety. Street-level security is moderate — urban precautions advised, especially at night.',
    },
    vibe: 'Up-and-coming, value-driven, and community-oriented — the smart investor\'s pick',
    bestFor: ['First-time buyers', 'Young professionals seeking value', 'Investors targeting capital appreciation', 'Small families priced out of Kilimani', 'Those who want hillside views at accessible prices'],
    pros: [
      'Best value in central Nairobi — significantly cheaper than Kilimani for equivalent space',
      'Stunning panoramic city and Ngong Hills views from hillside apartments',
      'Rapid capital appreciation as the area gentrifies',
      'Modern apartment inventory with pools, gyms, and backup generators',
      'Quiet residential character while just 5–10 minutes from Kilimani\'s energy',
    ],
    cons: [
      'Limited amenities within the neighbourhood — most shopping and dining requires a short drive',
      'Road infrastructure still improving — Oloitokitok and Gatundu roads can be rough',
      'Less vibrant dining and social scene than Kilimani',
      'Some pockets still developing — not uniformly polished',
      'Nightlife requires heading to Kilimani or Westlands',
    ],
    priceRange: 'KES 26M – 72M',
    rentalRange: 'KES 150,000 – 450,000/month',
    typicalRent1BR: 'KES 35,000 – 55,000',
    walkability: {
      rating: 2,
      description: 'Limited — the hillside terrain makes walking challenging, and amenities are spread out. Most residents drive or use Uber/Bolt for errands. Pleasant for recreational walks but not practical commuting.',
    },
    nightlife: {
      rating: 2,
      description: 'Quiet — a handful of local bars and eateries, but no nightlife scene. Kilimani (5–10 minutes) is the go-to for evening entertainment. The quiet character is part of the appeal for many residents.',
    },
    familyFriendliness: {
      rating: 3,
      description: 'Decent — quiet residential environment, some good schools nearby (Riara, Braeside). Less green space than Lavington or Karen, but apartment complexes increasingly include play areas and pools.',
    },
    greenSpace: {
      rating: 2,
      description: 'Limited — most green space is within apartment complexes (gardens, rooftop areas). Arboretum and Ngong Road Forest are 10–15 minutes away. The hillside location offers views more than greenery.',
    },
    valueForMoney: {
      rating: 5,
      description: 'Nairobi\'s best value among central neighbourhoods. Per-square-metre prices are 30–40% below Kilimani for properties just minutes apart. The gentrification trajectory suggests strong future appreciation.',
      note: 'Best value in central Nairobi',
    },
    prestige: {
      rating: 2,
      description: 'Modest — Kileleshwa is seen as practical and smart rather than prestigious. The area\'s reputation is rising as new developments improve quality, but it does not carry the social weight of Karen or Lavington.',
    },
    accessibility: {
      rating: 4,
      description: 'Good — 10–15 minutes to the CBD and Westlands. Central location with multiple route options. Slightly more removed than Kilimani but still well-connected.',
    },
    rentalYield: {
      rating: 5,
      description: 'Excellent at 7–9%. Lower purchase prices combined with strong rental demand from professionals priced out of Kilimani create some of Nairobi\'s best yields. New-build apartments in good locations are particularly strong performers.',
      note: 'Excellent rental yields',
    },
    schoolAccess: {
      rating: 3,
      description: 'Adequate — Riara School and Braeside are 5–10 minutes away. Fewer school options within the immediate neighbourhood, but good access with a short drive.',
    },
    healthAccess: {
      rating: 3,
      description: 'Adequate — Nairobi Hospital is 10 minutes away. Fewer clinics within Kileleshwa itself, but Kilimani and Lavington medical facilities are a short drive.',
    },
    verdict: 'The smart money pick — Kileleshwa offers central Nairobi\'s best value with a gentrification trajectory that rewards early investors. You sacrifice some polish and walkability for significant savings and strong appreciation potential. Ideal for first-time buyers and investors, increasingly attractive to young professionals priced out of Kilimani.',
  },
  {
    slug: 'parklands',
    name: 'Parklands',
    tagline: 'Central Convenience, Real Value',
    safety: {
      rating: 3,
      description: 'Moderate to good — most apartment buildings have security, and the busy commercial character provides passive surveillance during the day. Street-level safety is moderate — standard urban precautions apply, especially at night. Less secure than the gated northern suburbs.',
    },
    vibe: 'Diverse, practical, and multicultural — the insider\'s choice for central Nairobi value',
    bestFor: ['Medical professionals and students (Aga Khan)', 'Budget-conscious young professionals', 'Investors seeking affordable central property', 'Those who value multicultural community', 'People who need quick access to Westlands and the CBD'],
    pros: [
      'Nairobi\'s best central value — significantly cheaper than Westlands or Kilimani',
      'Unbeatable location — minutes from Westlands, the CBD, and major highways',
      'Aga Khan University Hospital is a world-class medical facility in the neighbourhood',
      'Rich multicultural character with outstanding Indian and international cuisine',
      'Strong rental demand from medical staff, students, and budget-conscious professionals',
    ],
    cons: [
      'Less polished than Westlands or Kilimani — mixed-use character with visible density',
      'Moderate safety — urban awareness required, less secure than gated suburbs',
      'Limited nightlife and entertainment within the neighbourhood',
      'Older building stock in some areas — quality varies significantly',
      'Some streets suffer from traffic congestion during peak hours',
    ],
    priceRange: 'KES 28M – 65M',
    rentalRange: 'KES 100,000 – 300,000/month',
    typicalRent1BR: 'KES 25,000 – 45,000',
    walkability: {
      rating: 3,
      description: 'Moderate — some pockets are walkable with local shops and eateries. Diamond Plaza and Parklands Shopping Centre are reachable on foot from certain areas. Tree-lined avenues make for pleasant walks, but pedestrian infrastructure is inconsistent.',
    },
    nightlife: {
      rating: 2,
      description: 'Limited — a handful of local pubs and bars. Westlands (5 minutes) provides the full nightlife experience. The proximity to Westlands while maintaining a quieter home environment is a key appeal.',
    },
    familyFriendliness: {
      rating: 3,
      description: 'Adequate — good schools (Aga Khan Academy, Oshwal Academy) and City Park nearby. Less green space and security than Karen or Lavington, but a practical choice for families on a budget.',
    },
    greenSpace: {
      rating: 3,
      description: 'Moderate — City Park borders the neighbourhood with walking trails and mature trees. Less green than Karen or Gigiri, but better than Westlands or Kilimani.',
    },
    valueForMoney: {
      rating: 5,
      description: 'Outstanding — the lowest prices of any central Nairobi neighbourhood with this level of access. Per-square-metre prices are 40–50% below Westlands for locations just minutes apart. The strongest value proposition in the city.',
      note: 'Best value in Nairobi overall',
    },
    prestige: {
      rating: 2,
      description: 'Modest — Parklands is seen as practical and sensible rather than prestigious. The multicultural, middle-class character is respected but does not carry elite social cachet.',
    },
    accessibility: {
      rating: 5,
      description: 'Excellent — arguably Nairobi\'s best-connected neighbourhood. Minutes from Westlands, the CBD, and major highways in all directions. Multiple route options. Good matatu connections and plentiful Uber/Bolt.',
      note: 'Best-connected neighbourhood in Nairobi',
    },
    rentalYield: {
      rating: 5,
      description: 'Excellent at 8–10%. Low purchase prices combined with strong demand from medical staff, students, and professionals create Nairobi\'s highest percentage yields. Affordable units near Aga Khan are particularly strong performers.',
      note: 'Highest percentage rental yields',
    },
    schoolAccess: {
      rating: 4,
      description: 'Good — Aga Khan Academy, Oshwal Academy, and Aga Khan High School are all within the neighbourhood. Hospital Hill Primary is well-regarded. Strong educational options for the price point.',
    },
    healthAccess: {
      rating: 5,
      description: 'Excellent — Aga Khan University Hospital is a leading teaching and referral hospital right in Parklands. MP Shah Hospital and numerous specialist clinics are nearby. Arguably Nairobi\'s best medical access.',
    },
    verdict: 'The value champion — Parklands delivers unbeatable central Nairobi access at the city\'s best prices. You trade polish and prestige for location and affordability, and for many buyers and renters, that is exactly the right trade. The ultimate practical choice for professionals, medical staff, and savvy investors who prioritise fundamentals over flash.',
  },
  {
    slug: 'lower-kabete',
    name: 'Lower Kabete',
    tagline: 'Nairobi\'s Rising Family Corridor',
    safety: {
      rating: 4,
      description: 'Good — most newer estates have 24/7 security, CCTV, and access control. The area is quieter and less dense than central neighbourhoods, which means more privacy but less passive surveillance. Gated estate living is the norm.',
    },
    vibe: 'Up-and-coming, family-oriented, and green — a smarter value alternative to Spring Valley',
    bestFor: ['Growing families seeking space', 'Professionals priced out of Spring Valley', 'Investors targeting appreciation', 'Those who want suburban peace with city access'],
    pros: [
      'Best space-for-price ratio among northern suburbs — similar plots to Spring Valley at half the cost',
      'Northern Bypass has transformed connectivity — 15 minutes to Westlands',
      'New gated townhouse communities with modern amenities',
      'Growing family community with good school proximity',
      'Strong appreciation potential as the area gentrifies',
    ],
    cons: [
      'Still developing — some roads and infrastructure are works in progress',
      'Limited amenities within the neighbourhood — most shopping and dining requires a drive',
      'No nightlife or entertainment — entirely dependent on Westlands',
      'Lower Kabete Road can be congested during peak hours',
      'Less established character than neighbouring Spring Valley',
    ],
    priceRange: 'KES 22M – 52M',
    rentalRange: 'KES 120,000 – 350,000/month',
    typicalRent1BR: 'KES 35,000 – 55,000',
    walkability: {
      rating: 2,
      description: 'Limited — the area is car-dependent. Estates are walkable within their gates, but reaching shops, schools, or restaurants requires a vehicle. No continuous pedestrian infrastructure between estates.',
    },
    nightlife: {
      rating: 1,
      description: 'Virtually non-existent — a handful of local pubs. Westlands (10–15 minutes) provides the full nightlife experience. The quiet character is part of the appeal for families.',
    },
    familyFriendliness: {
      rating: 4,
      description: 'Very good — spacious compounds, growing family community, good school proximity, and a quiet environment. Newer estates include play areas and pools. Less green space than Karen but more affordable.',
    },
    greenSpace: {
      rating: 3,
      description: 'Moderate — Karura Forest (15 minutes) is the nearest major green space. Private gardens within compounds provide greenery. Less public parkland than the established northern suburbs.',
    },
    valueForMoney: {
      rating: 5,
      description: 'Outstanding — the best value in the northern suburbs. Similar space to Spring Valley at 40–50% less. The Bypass has transformed the value equation. Early investors have seen 30–50% appreciation.',
      note: 'Best value in the northern suburbs',
    },
    prestige: {
      rating: 2,
      description: 'Modest — Lower Kabete is seen as practical and emerging rather than prestigious. The area\'s reputation is rising rapidly as new developments improve quality and professionals move in.',
    },
    accessibility: {
      rating: 4,
      description: 'Good — 15–20 minutes to Westlands via the Northern Bypass. The Bypass connection has been transformative. Multiple route options. Uber/Bolt are reliable. Car-dependent for daily life.',
    },
    rentalYield: {
      rating: 5,
      description: 'Excellent at 7–9%. Lower purchase prices combined with growing demand from professionals priced out of Spring Valley create strong yields. New-build townhouses in gated estates are particularly strong performers.',
      note: 'Excellent rental yields for the north',
    },
    schoolAccess: {
      rating: 3,
      description: 'Adequate — Peponi School, Brookhouse (Runda), and Oshwal Academy are 10–20 minutes away. Fewer schools within the immediate neighbourhood, but good access with a short drive.',
    },
    healthAccess: {
      rating: 3,
      description: 'Adequate — Aga Khan University Hospital (20 minutes), Avenue Hospital Westlands (15 minutes). Fewer clinics within Lower Kabete itself, but Westlands medical facilities are accessible.',
    },
    verdict: 'The smart family play — Lower Kabete delivers northern suburb space and greenery at prices that make sense for growing families. You sacrifice some polish and established character for significant savings and strong appreciation potential. The Northern Bypass has made it a genuinely viable alternative to Spring Valley and Lavington.',
  },
  {
    slug: 'riverside',
    name: 'Riverside',
    tagline: 'Nairobi\'s Hidden Riverside Oasis',
    safety: {
      rating: 5,
      description: 'Excellent — Riverside is one of Nairobi\'s safest residential areas. The concentration of diplomatic residences, strong building-level security, and the area\'s enclosed geography (bordered by the river) create a naturally secure environment. Riverside Drive is well-lit and regularly patrolled.',
      note: 'Among Nairobi\'s safest residential corridors',
    },
    vibe: 'Refined, serene, and exclusive — a hidden oasis of calm minutes from the city\'s energy',
    bestFor: ['Diplomats and embassy personnel', 'Senior executives', 'Those valuing privacy with proximity', 'Established professionals', 'Buyers seeking enduring value in a supply-constrained market'],
    pros: [
      'Unique riverside setting with lush greenery — unlike any other central Nairobi neighbourhood',
      'Excellent security — diplomatic presence and enclosed geography',
      'Minutes from Westlands, Kilimani, and Lavington — best central access of any premium area',
      'Naturally supply-constrained — enduring value driven by scarcity',
      'Riverside Drive is one of Nairobi\'s most pleasant roads — tree-lined, well-maintained, rarely congested',
    ],
    cons: [
      'Limited inventory — properties rarely available, creating a competitive market',
      'Fewer amenities within walking distance than Westlands or Kilimani',
      'Premium pricing — you pay for the riverside address and scarcity',
      'No nightlife or entertainment within Riverside itself',
      'Narrow geography means limited expansion — the neighbourhood cannot grow',
    ],
    priceRange: 'KES 52M – 117M',
    rentalRange: 'KES 250,000 – 650,000/month',
    typicalRent1BR: 'KES 70,000 – 110,000',
    walkability: {
      rating: 3,
      description: 'Moderate — Riverside Drive is pleasant for walks, and the Arboretum is 5 minutes away. However, amenities are spread out, and most errands require a vehicle. Walking to Westlands (15–20 minutes) is feasible.',
    },
    nightlife: {
      rating: 2,
      description: 'Quiet and refined — a few restaurant bars within apartment complexes. Hero rooftop bar at Trademark Hotel (5 minutes) is popular. Westlands (5 minutes) and Kilimani (5–10 minutes) provide full nightlife.',
    },
    familyFriendliness: {
      rating: 3,
      description: 'Decent — good security, green surroundings, and proximity to schools (Braeburn, Riara). Less family-oriented than Karen or Lavington — more apartment living than houses with gardens. Better suited to couples and professionals.',
    },
    greenSpace: {
      rating: 5,
      description: 'Outstanding for a central location — the riverside vegetation, mature trees, and well-manicured compounds create a uniquely green urban environment. Nairobi Arboretum (5 minutes) adds a major public green space.',
      note: 'Greenest central Nairobi neighbourhood',
    },
    valueForMoney: {
      rating: 3,
      description: 'Moderate — you pay a premium for the riverside address and scarcity. Per-square-metre prices are above Kilimani and Lavington. The value proposition is enduring scarcity and a unique setting, not square footage.',
    },
    prestige: {
      rating: 4,
      description: 'High — a Riverside address signals sophistication and insider knowledge. Less famous than Karen or Muthaiga, but quietly prestigious among diplomats and executives who know Nairobi well.',
    },
    accessibility: {
      rating: 5,
      description: 'Superb — arguably Nairobi\'s best-positioned premium neighbourhood. Minutes from Westlands, Kilimani, Lavington, and the CBD. The Expressway on-ramp is 5 minutes away. Multiple route options in all directions.',
      note: 'Best-positioned premium neighbourhood',
    },
    rentalYield: {
      rating: 4,
      description: 'Strong at 5–6%. Diplomatic demand ensures stable occupancy. While high property values cap percentage yields, the tenant quality and stability are exceptional. Embassy housing offices maintain waiting lists.',
    },
    schoolAccess: {
      rating: 4,
      description: 'Good — Braeburn, Riara, Braeside, and Strathmore are all 5–15 minutes away. Not as dense with international schools as Gigiri or Karen, but strong options within a short drive.',
    },
    healthAccess: {
      rating: 5,
      description: 'Excellent — Nairobi Hospital (5 minutes), Aga Khan University Hospital (15 minutes), multiple private clinics within a short drive. Among the best medical access in Nairobi.',
    },
    verdict: 'The insider\'s choice — Riverside combines central Nairobi\'s best access with a genuinely unique green, riverside setting. You pay for scarcity and the address, but you get a living environment that exists nowhere else in the city. Ideal for diplomats and executives who want to be near the action without living in it.',
  },
  {
    slug: 'spring-valley',
    name: 'Spring Valley',
    tagline: 'Old Nairobi Elegance, Modern Convenience',
    safety: {
      rating: 5,
      description: 'Excellent — predominantly gated homes with private security arrangements, active neighbourhood watch, and a low-density character that naturally limits risk. The presence of diplomatic residences elevates overall security. One of Nairobi\'s safest neighbourhoods.',
      note: 'Among Nairobi\'s safest residential areas',
    },
    vibe: 'Established, luxurious, and quietly prestigious — old Nairobi elegance with modern convenience',
    bestFor: ['Diplomats and business leaders', 'Established families', 'Buyers seeking space and prestige', 'Long-term investors in stable luxury', 'Those who value privacy over trendiness'],
    pros: [
      'Generous plot sizes with mature indigenous trees — increasingly rare in Nairobi',
      'Consistent quarterly price appreciation (3.8–4.2%) — one of Nairobi\'s most stable luxury markets',
      'Proximity to Westlands (10–15 minutes) with suburban peace and privacy',
      'Strong diplomatic and business elite community',
      'Properties rarely reach the open market — exclusivity by design',
    ],
    cons: [
      'Expensive — premium pricing for both purchase and rent',
      'Limited inventory — the area is fully built out with few new developments',
      'No nightlife or entertainment — entirely dependent on Westlands',
      'Car-dependent — no amenities within walking distance',
      'Less green public space than Karen — greenery is private rather than shared',
    ],
    priceRange: 'KES 72M – 195M',
    rentalRange: 'KES 350,000 – 900,000/month',
    typicalRent1BR: 'KES 65,000 – 95,000',
    walkability: {
      rating: 1,
      description: 'Not walkable — Spring Valley is designed for privacy and car-based living. No shops, cafes, or amenities within walking distance. Pleasant for exercise walks but not practical for errands.',
    },
    nightlife: {
      rating: 1,
      description: 'Virtually non-existent — entirely deliberate. Social life is private: dinner parties, embassy functions, and country club events. Westlands is 10–15 minutes for any nightlife.',
    },
    familyFriendliness: {
      rating: 5,
      description: 'Excellent — large homes with gardens, quiet streets, excellent security, and good school proximity. The established community and private compounds create an ideal family environment. Less community infrastructure than Karen but more central.',
      note: 'Excellent for established families',
    },
    greenSpace: {
      rating: 4,
      description: 'Very good — most properties feature extensive private gardens with mature trees. Karura Forest (15 minutes) for public green space. Greenery is private and generous rather than shared.',
    },
    valueForMoney: {
      rating: 2,
      description: 'Expensive — you pay a significant premium for the Spring Valley address and established character. Price per square metre is among Nairobi\'s highest. The value is in stability and prestige, not affordability.',
    },
    prestige: {
      rating: 5,
      description: 'Very high — a Spring Valley address signals old-money sophistication and established success. Less famous than Muthaiga or Karen internationally, but deeply respected among Kenyans and long-term residents.',
      note: 'Deeply prestigious among those who know Nairobi',
    },
    accessibility: {
      rating: 4,
      description: 'Good — 12–18 minutes to Westlands and the CBD. Multiple route options. The Expressway on-ramp is 10–15 minutes. Car-dependent but well-connected.',
    },
    rentalYield: {
      rating: 3,
      description: 'Moderate at 3–4%. High property values cap yield potential, but rental income is exceptionally stable with diplomatic and executive tenants. Near-zero vacancy for quality properties.',
    },
    schoolAccess: {
      rating: 4,
      description: 'Good — Peponi School, Brookhouse (Runda), Oshwal Academy, and Aga Khan Academy are 10–20 minutes away. Strong international school options with a short drive.',
    },
    healthAccess: {
      rating: 4,
      description: 'Good — Aga Khan University Hospital (15–20 minutes), Avenue Hospital Westlands (10–15 minutes), Nairobi Hospital (15–20 minutes). Good coverage with a short drive.',
    },
    verdict: 'The establishment choice — Spring Valley offers old Nairobi elegance with enduring prestige and remarkable price stability. You sacrifice nightlife and walkability for space, privacy, and a neighbourhood that has been desirable for generations and will remain so. The ultimate long-term family investment in a stable, established luxury market.',
  },
  {
    slug: 'rosslyn',
    name: 'Rosslyn',
    tagline: 'Countryside Serenity in Nairobi\'s Northern Corridor',
    safety: {
      rating: 5,
      description: 'Exceptional — Rosslyn rivals Muthaiga and Gigiri as Nairobi\'s safest residential area. Ultra-low density, sprawling gated compounds with private security, limited access points, and proximity to Gigiri\'s diplomatic security infrastructure create an almost unparalleled safety environment.',
      note: 'Maximum security — on par with Nairobi\'s safest enclaves',
    },
    vibe: 'Serene, ultra-private, and impossibly green — countryside living with diplomatic-quarter convenience',
    bestFor: ['Ultra-high-net-worth families', 'Diplomats seeking maximum space', 'International school families (Rosslyn Academy)', 'Buyers for whom space and seclusion are paramount', 'Those who find Runda too planned and Gigiri too busy'],
    pros: [
      'Acre-plus compounds are the norm — increasingly rare and valuable in Nairobi',
      'Rosslyn Academy — one of Nairobi\'s premier international schools — right in the neighbourhood',
      'Countryside atmosphere with genuine peace, birdlife, and green space',
      'Maximum privacy — compounds are hidden from view, roads are quiet',
      'Proximity to Gigiri\'s diplomatic amenities without the density',
    ],
    cons: [
      'Very expensive — acre-plus compounds command premium prices',
      'Extremely limited inventory — properties rarely reach the open market',
      'Remote feel — 20–25 minutes from the CBD and Westlands',
      'Virtually no amenities within the neighbourhood — entirely car-dependent',
      'Quiet to the point of isolation — not for those seeking any urban energy',
    ],
    priceRange: 'KES 98M – 325M+',
    rentalRange: 'KES 450,000 – 1,500,000/month',
    typicalRent1BR: 'KES 70,000 – 100,000',
    walkability: {
      rating: 1,
      description: 'Not walkable — Rosslyn is designed for maximum privacy and space. Compounds are walkable within their gates, but there are no shops, cafes, or amenities within walking distance. Entirely car-dependent.',
    },
    nightlife: {
      rating: 1,
      description: 'None — entirely deliberate. Social life is private: dinner parties, diplomatic receptions, and family gatherings. Gigiri (10 minutes) for a civilised drink, Westlands (20–25 minutes) for nightlife.',
    },
    familyFriendliness: {
      rating: 5,
      description: 'Superb for families who value space and privacy — acre-plus compounds, Rosslyn Academy at your doorstep, maximum security, and a countryside environment. Less community infrastructure than Karen but more exclusive.',
      note: 'Ideal for families prioritising space and privacy',
    },
    greenSpace: {
      rating: 5,
      description: 'Exceptional — most compounds exceed an acre with mature indigenous trees, extensive gardens, and a countryside character. Karura Forest (10–15 minutes) for public green space. Rosslyn is essentially a private nature reserve.',
      note: 'Nairobi\'s most generously green private compounds',
    },
    valueForMoney: {
      rating: 1,
      description: 'The worst value by any rational metric — but value is not the point. You are paying for space, privacy, and a countryside lifestyle that is virtually irreplaceable as Nairobi densifies. A trophy purchase, not a value play.',
    },
    prestige: {
      rating: 5,
      description: 'Very high in diplomatic and international school circles — a Rosslyn address signals space, privacy, and international community connections. Less globally famous than Muthaiga but deeply respected in the northern diplomatic corridor.',
    },
    accessibility: {
      rating: 2,
      description: 'Limited — 20–25 minutes from the CBD. The Northern Bypass helps, but the distance is real. Entirely car-dependent. Uber/Bolt with 5–10 minute waits. Not practical for those needing daily CBD access.',
    },
    rentalYield: {
      rating: 2,
      description: 'Low at 2–3% — property values are so high that even premium diplomatic rents cannot generate strong yields. The investment case rests on capital appreciation and lifestyle, not cash flow.',
    },
    schoolAccess: {
      rating: 5,
      description: 'Superb — Rosslyn Academy is in the neighbourhood itself. ISK, Peponi, and the German School are 10–15 minutes away. Perhaps Nairobi\'s best concentration of top-tier international schools.',
      note: 'World-class international school access',
    },
    healthAccess: {
      rating: 3,
      description: 'Adequate — Aga Khan University Hospital (20 minutes), Gertrude\'s Children\'s Hospital (15 minutes), UNON medical centre (10 minutes for UN staff). Adequate but requires a drive.',
    },
    verdict: 'The countryside dream — Rosslyn offers a living experience that is becoming impossible to find elsewhere in Nairobi: acre-plus compounds, genuine peace and bird song, and a top-tier international school at your doorstep. You trade urban energy and accessibility for space and serenity. Not a value play — a lifestyle purchase for those who can afford the ultimate in northern suburban privacy.',
  },
];