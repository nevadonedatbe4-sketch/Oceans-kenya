/**
 * Thumbnail images for blog list items.
 *
 * Two kinds of visuals are covered here:
 *  - Real venue photos pulled from the Places / Amenities database wherever a
 *    clean match exists for a venue name (hospitals, malls, etc.).
 *  - Editorial "topic" covers for the non-place lists that appear across the
 *    guides (curricula, criteria, tips) so EVERY list item in EVERY article
 *    still shows a consistent thumbnail.
 *
 * `placeImageFor` never returns undefined — unknown names fall back to a
 * neutral editorial cover so no list item renders an empty thumbnail box.
 */

const PLACE_IMAGES: Record<string, string> = {
  // ---- Hospitals (hospitals-in-nairobi-2026) ----
  'the nairobi hospital':
    'https://ohchimtistvrhqghbhwc.supabase.co/storage/v1/object/public/property-images/pages/amenities/1789809774174-6qhou8.webp',
  'aga khan university hospital':
    'https://ohchimtistvrhqghbhwc.supabase.co/storage/v1/object/public/property-images/pages/amenities/1790237760802-4zi04d.jpg',
  'mp shah hospital':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20modern%20private%20hospital%20building%20in%20Parklands%20Nairobi%2C%20warm%20cream%20and%20terracotta%20facade%2C%20curved%20driveway%20entrance%2C%20palm%20trees%2C%20soft%20morning%20light%2C%20calm%20healthcare%20mood%2C%20clean%20minimal%20composition%20with%20muted%20neutral%20background&width=600&height=600&seq=blog-thumb-mpshah&orientation=squarish',
  'the karen hospital':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20modern%20low-rise%20private%20hospital%20in%20Karen%20Nairobi%2C%20warm%20sandstone%20and%20glass%20facade%2C%20lush%20green%20garden%20surroundings%2C%20soft%20daylight%2C%20calm%20reassuring%20healthcare%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-karenhospital&orientation=squarish',
  "gertrude's children's hospital":
    'https://ohchimtistvrhqghbhwc.supabase.co/storage/v1/object/public/property-images/pages/amenities/1790075946068-jnu0t3.webp',

  // ---- Shopping malls (best-shopping-malls-nairobi-2026) ----
  'two rivers mall':
    'https://ohchimtistvrhqghbhwc.supabase.co/storage/v1/object/public/property-images/pages/amenities/1789982161609-vcvisa.webp',
  'westgate mall':
    'https://ohchimtistvrhqghbhwc.supabase.co/storage/v1/object/public/property-images/pages/amenities/1789984486185-axyg8x.jpg',
  'yaya centre':
    'https://ohchimtistvrhqghbhwc.supabase.co/storage/v1/object/public/property-images/pages/amenities/1789748350191-idv3mc.webp',
  'sarit centre':
    'https://ohchimtistvrhqghbhwc.supabase.co/storage/v1/object/public/property-images/pages/amenities/1790252190581-czmr8t.jpg',
  'galleria shopping mall':
    'https://ohchimtistvrhqghbhwc.supabase.co/storage/v1/object/public/property-images/pages/amenities/1790060250718-z3inb7.webp',
  'the junction':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20stylish%20open-air%20shopping%20mall%20in%20Nairobi%20Kilimani%2C%20warm%20terracotta%20and%20stone%20architecture%2C%20palm%20trees%2C%20skylight%20walkway%2C%20soft%20afternoon%20light%2C%20calm%20retail%20mood%2C%20clean%20minimal%20composition&width=600&height=600&seq=blog-thumb-junctionmall&orientation=squarish',
  'diamond plaza':
    'https://ohchimtistvrhqghbhwc.supabase.co/storage/v1/object/public/property-images/pages/amenities/1790252256382-j69ic6.jpg',
  'the hub karen':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20boutique%20open-air%20shopping%20centre%20in%20Karen%20Nairobi%2C%20warm%20timber%20and%20stone%20architecture%2C%20greenery%20and%20paved%20courtyard%2C%20soft%20golden%20light%2C%20relaxed%20upscale%20mood%2C%20clean%20minimal%20composition&width=600&height=600&seq=blog-thumb-hubkaren&orientation=squarish',
  'lavington mall':
    'https://ohchimtistvrhqghbhwc.supabase.co/storage/v1/object/public/property-images/pages/amenities/1790426015004-y85bui.jpg',
  'broadwalk and westlands square':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20small%20modern%20neighbourhood%20shopping%20centre%20in%20Nairobi%20Westlands%2C%20warm%20neutral%20facade%20with%20glass%20shopfronts%2C%20tidy%20paved%20walkway%2C%20soft%20daylight%2C%20calm%20everyday%20retail%20mood%2C%20clean%20minimal%20composition&width=600&height=600&seq=blog-thumb-broadwalk&orientation=squarish',

  // ---- Curricula (best-private-schools-nairobi-2026) ----
  'british / cambridge (igcse)':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20tidy%20classroom%20in%20a%20British%20international%20school%2C%20wooden%20desks%20in%20neat%20rows%2C%20textbooks%20and%20chalkboard%2C%20warm%20cream%20walls%2C%20soft%20daylight%2C%20calm%20academic%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-curriculum-british&orientation=squarish',
  'international baccalaureate (ib)':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20bright%20modern%20inquiry-based%20classroom%20with%20round%20tables%2C%20a%20globe%20and%20stacked%20books%2C%20large%20windows%2C%20warm%20natural%20light%2C%20calm%20academic%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-curriculum-ib&orientation=squarish',
  'american curriculum':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20an%20American-style%20school%20corridor%20with%20lockers%20along%20warm%20wood%20and%20cream%20walls%2C%20polished%20floor%2C%20soft%20daylight%2C%20calm%20academic%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-curriculum-american&orientation=squarish',
  'cbc (competency-based curriculum)':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20happy%20Kenyan%20primary%20school%20children%20in%20uniform%20working%20at%20desks%20in%20a%20bright%20classroom%2C%20warm%20natural%20light%2C%20calm%20academic%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-curriculum-cbc&orientation=squarish',
  'montessori & early years':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20Montessori%20early-years%20playroom%20with%20wooden%20toys%2C%20low%20shelves%20and%20a%20soft%20rug%2C%20warm%20cream%20tones%2C%20gentle%20daylight%2C%20calm%20nurturing%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-curriculum-montessori&orientation=squarish',

  // ---- Family / school-run criteria ----
  'commute time':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20an%20empty%20quiet%20suburban%20road%20lined%20with%20green%20trees%20leading%20toward%20a%20school%20gate%2C%20soft%20morning%20light%2C%20calm%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-commute&orientation=squarish',
  community:
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20neighbours%20chatting%20outside%20their%20homes%20on%20a%20leafy%20suburban%20street%2C%20warm%20afternoon%20light%2C%20friendly%20calm%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-community&orientation=squarish',
  space:
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20large%20green%20garden%20lawn%20behind%20a%20family%20home%2C%20mature%20trees%20and%20hedges%2C%20soft%20daylight%2C%20calm%20spacious%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-space&orientation=squarish',

  // ---- Neighbourhood facts ----
  'typical homes':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20an%20elegant%20Nairobi%20villa%20with%20a%20terracotta%20roof%20and%20mature%20landscaped%20garden%2C%20warm%20golden%20light%2C%20calm%20upscale%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-homes&orientation=squarish',
  'price range':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20house%20key%20and%20a%20small%20sold%20sign%20resting%20on%20a%20wooden%20table%2C%20warm%20neutral%20light%2C%20calm%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-price&orientation=squarish',
  'best for':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20happy%20family%20walking%20with%20children%20along%20a%20leafy%20Nairobi%20neighbourhood%20pavement%2C%20warm%20golden%20light%2C%20calm%20lifestyle%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-bestfor&orientation=squarish',

  // ---- Resident profiles ----
  'young professionals':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20two%20young%20professionals%20with%20laptops%20and%20coffee%20in%20a%20bright%20Nairobi%20cafe%2C%20warm%20daylight%2C%20calm%20lifestyle%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-professionals&orientation=squarish',
  'rental investors':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20modern%20apartment%20blocks%20in%20Kilimani%20Nairobi%20with%20clean%20balconies%20and%20landscaped%20grounds%2C%20warm%20daylight%2C%20calm%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-investors&orientation=squarish',
  'city lovers':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20the%20Nairobi%20city%20skyline%20at%20golden%20hour%20with%20mid-rise%20towers%2C%20warm%20light%2C%20calm%20urban%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-citylovers&orientation=squarish',

  // ---- What to look for in a neighbourhood ----
  schools:
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20welcoming%20private%20school%20entrance%20with%20a%20paved%20path%20and%20green%20hedges%2C%20soft%20daylight%2C%20calm%20academic%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-schools&orientation=squarish',
  'restaurants & malls':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20an%20elegant%20open-air%20mall%20walkway%20with%20restaurants%20and%20cafe%20terraces%2C%20warm%20afternoon%20light%2C%20calm%20lifestyle%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-dining&orientation=squarish',
  hospitals:
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20modern%20hospital%20entrance%20with%20clean%20signage%20and%20glass%20doors%2C%20warm%20daylight%2C%20calm%20reassuring%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-hospitals&orientation=squarish',
  'supermarkets & gyms':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20bright%20modern%20supermarket%20aisle%20beside%20a%20fitness%20gym%20interior%2C%20clean%20shelves%20and%20equipment%2C%20warm%20daylight%2C%20calm%20everyday%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-supermarkets&orientation=squarish',
  'parks & green spaces':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20leafy%20Nairobi%20park%20with%20walking%20paths%20and%20tall%20trees%2C%20soft%20green%20tones%2C%20warm%20daylight%2C%20calm%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-parks&orientation=squarish',

  // ---- Rental yield drivers ----
  'proximity to work':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20sleek%20Nairobi%20office%20district%20with%20glass%20towers%20and%20a%20clean%20paved%20plaza%2C%20warm%20daylight%2C%20calm%20business%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-work&orientation=squarish',
  'transport links':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20modern%20expressway%20with%20smooth%20lanes%20curving%20through%20green%20Nairobi%20outskirts%2C%20warm%20daylight%2C%20calm%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-transport&orientation=squarish',
  amenities:
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20well-serviced%20neighbourhood%20high%20street%20with%20shops%2C%20a%20pharmacy%20and%20a%20salon%2C%20warm%20daylight%2C%20calm%20everyday%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-amenities&orientation=squarish',

  // ---- Comparison points ----
  security:
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20secure%20gated%20entrance%20to%20an%20upscale%20Nairobi%20compound%20with%20a%20boom%20barrier%20and%20guardhouse%2C%20warm%20daylight%2C%20calm%20reassuring%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-security&orientation=squarish',
  vibe:
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20warm%20evening%20street%20ambience%20in%20Westlands%20Nairobi%20with%20softly%20lit%20cafes%2C%20golden%20light%2C%20calm%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-vibe&orientation=squarish',
  'trade-off':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20balance%20scale%20with%20a%20small%20house%20model%20and%20greenery%20on%20a%20wooden%20table%2C%20warm%20neutral%20light%2C%20calm%20conceptual%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-tradeoff&orientation=squarish',
  'neighbouring option':
    'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20quiet%20leafy%20residential%20lane%20with%20apartment%20blocks%20and%20hedges%20in%20Kileleshwa%20Nairobi%2C%20soft%20daylight%2C%20calm%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-topic-neighbouring&orientation=squarish',
};

/** Neutral editorial cover used when a list item has no specific match. */
const FALLBACK_PLACE_IMAGE =
  'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20calm%20leafy%20Nairobi%20neighbourhood%20with%20trees%2C%20tidy%20pavement%20and%20soft%20warm%20daylight%2C%20understated%20lifestyle%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-thumb-fallback&orientation=squarish';

/** Normalises a list-item label so it can be looked up consistently. */
export function normalizePlaceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]+$/, '')
    .trim();
}

/**
 * Returns the thumbnail image URL for a labelled list item. Always returns a
 * usable URL so every list item renders with a thumbnail.
 */
export function placeImageFor(name: string): string {
  if (!name) return FALLBACK_PLACE_IMAGE;
  return PLACE_IMAGES[normalizePlaceName(name)] || FALLBACK_PLACE_IMAGE;
}

/**
 * Neutral editorial cover used when an article section heading matches nothing.
 */
const SECTION_FALLBACK_IMAGE =
  'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20calm%20leafy%20Nairobi%20neighbourhood%20street%20with%20trees%20and%20soft%20warm%20daylight%2C%20understated%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-fallback&orientation=squarish';

/**
 * Section-heading thumbnails.
 *
 * Guides that carry no bullet lists (e.g. "Where to Eat in Nairobi") still get
 * a thumbnail: one is attached to every <h3> section heading. Matching is done
 * on the lower-cased heading text; the first rule whose keyword appears wins,
 * so more specific neighbourhood/venue rules are listed ahead of generic topics.
 */
const SECTION_KEYWORD_IMAGES: Array<{ keys: string[]; image: string }> = [
  // ---- Neighbourhoods (most specific, listed first) ----
  {
    keys: ['westlands'],
    image:
      'https://readdy.ai/api/search-image?query=Modern%20Westlands%20Nairobi%20streetscape%20with%20glass%20office%20towers%2C%20warm%20restaurant%20terraces%20and%20soft%20golden%20daylight%2C%20upscale%20urban%20lifestyle%20mood%2C%20clean%20minimal%20composition%2C%20muted%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-westlands&orientation=squarish',
  },
  {
    keys: ['kilimani', 'hurlingham'],
    image:
      'https://readdy.ai/api/search-image?query=Kilimani%20Nairobi%20street%20with%20contemporary%20apartment%20towers%2C%20cafe%20terraces%20and%20a%20leafy%20sidewalk%2C%20warm%20afternoon%20light%2C%20calm%20urban%20mood%2C%20clean%20minimal%20composition%2C%20muted%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-kilimani&orientation=squarish',
  },
  {
    keys: ['kileleshwa'],
    image:
      'https://readdy.ai/api/search-image?query=Leafy%20Kileleshwa%20Nairobi%20residential%20lane%20with%20modern%20apartment%20blocks%2C%20tall%20green%20trees%20and%20hedges%2C%20soft%20daylight%2C%20calm%20suburban%20mood%2C%20clean%20minimal%20composition%2C%20muted%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-kileleshwa&orientation=squarish',
  },
  {
    keys: ['lavington'],
    image:
      'https://readdy.ai/api/search-image?query=Upscale%20leafy%20Lavington%20Nairobi%20street%20with%20elegant%20homes%20behind%20green%20hedges%2C%20mature%20trees%2C%20warm%20golden%20light%2C%20calm%20residential%20mood%2C%20clean%20minimal%20composition%2C%20muted%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-lavington&orientation=squarish',
  },
  {
    keys: ['karen', 'langata'],
    image:
      'https://readdy.ai/api/search-image?query=Elegant%20Karen%20Nairobi%20garden%20suburb%20with%20a%20large%20gabled%20home%20behind%20a%20manicured%20lawn%20and%20mature%20trees%2C%20warm%20golden%20light%2C%20calm%20upscale%20mood%2C%20clean%20minimal%20composition%2C%20muted%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-karen&orientation=squarish',
  },
  {
    keys: ['runda'],
    image:
      'https://readdy.ai/api/search-image?query=Gated%20Runda%20Nairobi%20estate%20entrance%20with%20manicured%20hedges%2C%20a%20paved%20driveway%20and%20tropical%20greenery%2C%20warm%20daylight%2C%20calm%20secure%20mood%2C%20clean%20minimal%20composition%2C%20muted%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-runda&orientation=squarish',
  },
  {
    keys: ['muthaiga'],
    image:
      'https://readdy.ai/api/search-image?query=Established%20Muthaiga%20Nairobi%20estate%20with%20a%20stately%20colonial%20era%20house%20behind%20tall%20trees%2C%20warm%20afternoon%20light%2C%20discreet%20prestige%20mood%2C%20clean%20minimal%20composition%2C%20muted%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-muthaiga&orientation=squarish',
  },
  {
    keys: ['gigiri', 'rosslyn'],
    image:
      'https://readdy.ai/api/search-image?query=Green%20diplomatic%20Gigiri%20Nairobi%20avenue%20with%20embassy%20compounds%20and%20tall%20trees%2C%20soft%20daylight%2C%20calm%20exclusive%20mood%2C%20clean%20minimal%20composition%2C%20muted%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-gigiri&orientation=squarish',
  },
  {
    keys: ['parklands', 'riverside'],
    image:
      'https://readdy.ai/api/search-image?query=Vibrant%20Parklands%20Nairobi%20high%20street%20with%20colourful%20shopfronts%2C%20cafes%20and%20a%20tidy%20pavement%2C%20warm%20daylight%2C%20lively%20local%20mood%2C%20clean%20minimal%20composition%2C%20muted%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-parklands&orientation=squarish',
  },
  {
    keys: ['spring valley', 'lower kabete'],
    image:
      'https://readdy.ai/api/search-image?query=Quiet%20leafy%20Spring%20Valley%20Nairobi%20lane%20with%20large%20homes%20and%20dense%20greenery%2C%20soft%20morning%20light%2C%20calm%20residential%20mood%2C%20clean%20minimal%20composition%2C%20muted%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-springvalley&orientation=squarish',
  },
  {
    keys: ['who they suit'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20residents%20chatting%20outside%20their%20homes%20on%20a%20leafy%20Nairobi%20street%2C%20warm%20afternoon%20light%2C%20friendly%20calm%20mood%2C%20clean%20minimal%20composition%2C%20muted%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-community&orientation=squarish',
  },

  // ---- Health ----
  {
    keys: ['emergency', '24-hour', '24 hour'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20hospital%20emergency%20entrance%20with%20an%20ambulance%20parked%20outside%2C%20warm%20daylight%2C%20calm%20clinical%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-emergency&orientation=squarish',
  },
  {
    keys: ['clinic'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20small%20neighbourhood%20medical%20clinic%20entrance%20with%20clean%20signage%20and%20potted%20plants%2C%20warm%20daylight%2C%20calm%20reassuring%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-clinic&orientation=squarish',
  },
  {
    keys: ['hospital'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20modern%20private%20hospital%20building%20with%20a%20clean%20entrance%20and%20glass%20doors%2C%20warm%20cream%20facade%2C%20soft%20daylight%2C%20calm%20reassuring%20healthcare%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-hospital&orientation=squarish',
  },
  {
    keys: ['healthcare', 'health'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20bright%20modern%20hospital%20reception%20with%20a%20wheelchair%20and%20calm%20staff%2C%20warm%20daylight%2C%20reassuring%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-healthcare&orientation=squarish',
  },

  // ---- Schools ----
  {
    keys: ['curriculum'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20tidy%20classroom%20with%20wooden%20desks%2C%20textbooks%20and%20a%20chalkboard%2C%20warm%20cream%20walls%2C%20soft%20daylight%2C%20calm%20academic%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-curriculum&orientation=squarish',
  },
  {
    keys: ['montessori', 'early years'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20Montessori%20early%20years%20room%20with%20wooden%20toys%2C%20low%20shelves%20and%20a%20soft%20rug%2C%20warm%20cream%20tones%2C%20gentle%20daylight%2C%20calm%20nurturing%20mood%2C%20clean%20minimal%20composition&width=600&height=600&seq=blog-section-montessori&orientation=squarish',
  },
  {
    keys: ['school', 'catchment'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20prestigious%20private%20school%20campus%20with%20a%20stone%20entrance%20and%20green%20lawns%2C%20soft%20daylight%2C%20calm%20academic%20mood%2C%20clean%20minimal%20composition%2C%20muted%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-school&orientation=squarish',
  },

  // ---- Lifestyle & dining ----
  {
    keys: ['nightlife', 'after dark', 'social capital'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20warm%20evening%20Westlands%20Nairobi%20street%20with%20softly%20glowing%20bars%20and%20rooftop%20terraces%2C%20golden%20ambient%20light%2C%20lively%20nightlife%20mood%2C%20clean%20minimal%20composition%2C%20amber%20tones&width=600&height=600&seq=blog-section-nightlife&orientation=squarish',
  },
  {
    keys: ['brunch'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20sunny%20weekend%20brunch%20table%20with%20coffee%2C%20pastries%20and%20fresh%20fruit%20at%20a%20leafy%20Nairobi%20cafe%2C%20warm%20daylight%2C%20relaxed%20mood%2C%20clean%20minimal%20composition%2C%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-brunch&orientation=squarish',
  },
  {
    keys: ['lives well', 'lifestyle'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20warm%20outdoor%20Nairobi%20terrace%20with%20softly%20lit%20dining%20tables%20and%20greenery%20at%20dusk%2C%20golden%20ambient%20light%2C%20relaxed%20lifestyle%20mood%2C%20clean%20minimal%20composition%2C%20amber%20tones&width=600&height=600&seq=blog-section-lifestyle&orientation=squarish',
  },
  {
    keys: ['dining', 'eat', 'food', 'restaurant'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20an%20elegant%20Nairobi%20restaurant%20table%20with%20refined%20modern%20African%20dishes%2C%20warm%20ambient%20light%2C%20appetising%20dining%20mood%2C%20clean%20minimal%20composition%2C%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-food&orientation=squarish',
  },
  {
    keys: ['coffee', 'cafe', 'café'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20cosy%20Nairobi%20speciality%20coffee%20bar%20with%20a%20barista%20pouring%20latte%20art%2C%20warm%20daylight%2C%20calm%20cafe%20mood%2C%20clean%20minimal%20composition%2C%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-coffee&orientation=squarish',
  },

  // ---- Things to do ----
  {
    keys: ['outdoor', 'nature', 'green space', 'parks'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20lush%20Nairobi%20forest%20trail%20with%20tall%20trees%20and%20soft%20green%20light%2C%20warm%20daylight%2C%20tranquil%20nature%20mood%2C%20clean%20minimal%20composition%2C%20muted%20green%20neutral%20tones&width=600&height=600&seq=blog-section-nature&orientation=squarish',
  },
  {
    keys: ['art and', 'gallery', 'culture'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20bright%20Nairobi%20art%20gallery%20with%20framed%20paintings%20on%20warm%20white%20walls%2C%20soft%20daylight%2C%20calm%20cultural%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-art&orientation=squarish',
  },
  {
    keys: ['shopping', 'markets'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20vibrant%20Nairobi%20weekend%20craft%20market%20with%20stalls%20and%20bright%20fabrics%2C%20warm%20daylight%2C%20lively%20local%20mood%2C%20clean%20minimal%20composition%2C%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-markets&orientation=squarish',
  },
  {
    keys: ['mall'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20bright%20upscale%20Nairobi%20shopping%20mall%20interior%20with%20polished%20floors%20and%20glass%20storefronts%2C%20warm%20daylight%2C%20calm%20retail%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-mall&orientation=squarish',
  },

  // ---- Family ----
  {
    keys: ['family'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20happy%20family%20walking%20along%20a%20leafy%20Nairobi%20neighbourhood%20pavement%2C%20warm%20golden%20light%2C%20calm%20lifestyle%20mood%2C%20clean%20minimal%20composition%2C%20muted%20warm%20neutral%20tones&width=600&height=600&seq=blog-section-family&orientation=squarish',
  },

  // ---- Market & investment ----
  {
    keys: ['off-plan', 'off plan'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20modern%20residential%20construction%20site%20with%20a%20crane%20and%20a%20rising%20apartment%20structure%2C%20warm%20daylight%2C%20calm%20progress%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-offplan&orientation=squarish',
  },
  {
    keys: ['cbd'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20the%20Nairobi%20central%20business%20district%20with%20tall%20office%20towers%20and%20busy%20streets%2C%20warm%20daylight%2C%20calm%20urban%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-cbd&orientation=squarish',
  },
  {
    keys: ['yield'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20modern%20Nairobi%20apartment%20towers%20with%20glass%20balconies%20rising%20above%20greenery%2C%20warm%20daylight%2C%20calm%20investment%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-investment&orientation=squarish',
  },
  {
    keys: ['investment', 'action is', 'corridors'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20modern%20Nairobi%20apartment%20towers%20with%20glass%20balconies%20rising%20above%20greenery%2C%20warm%20daylight%2C%20calm%20investment%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-investment&orientation=squarish',
  },
  {
    keys: ['numbers'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20property%20investment%20documents%2C%20a%20calculator%20and%20a%20house%20key%20on%20a%20warm%20wooden%20desk%2C%20soft%20daylight%2C%20calm%20analytical%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-numbers&orientation=squarish',
  },
  {
    keys: ['outlook', 'what to watch', 'second half'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20an%20open%20road%20leading%20toward%20the%20Nairobi%20skyline%20at%20dawn%2C%20warm%20light%2C%20calm%20forward%20looking%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-outlook&orientation=squarish',
  },
  {
    keys: ['location matters', 'location'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20folded%20city%20map%20with%20a%20location%20pin%20on%20a%20warm%20wooden%20table%2C%20soft%20daylight%2C%20calm%20planning%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-location&orientation=squarish',
  },
  {
    keys: ['big picture', 'market'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20the%20Nairobi%20city%20skyline%20at%20golden%20hour%20with%20mixed%20commercial%20towers%2C%20warm%20light%2C%20calm%20analytical%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-market&orientation=squarish',
  },

  // ---- Property & guide framing ----
  {
    keys: ['property', 'value'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20an%20elegant%20Nairobi%20home%20with%20a%20for%20sale%20sign%20on%20a%20manicured%20lawn%2C%20warm%20afternoon%20light%2C%20calm%20property%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-property&orientation=squarish',
  },
  {
    keys: ['compare', 'comparison'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20two%20elegant%20Nairobi%20houses%20side%20by%20side%20under%20a%20clear%20sky%2C%20warm%20daylight%2C%20calm%20comparison%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-compare&orientation=squarish',
  },
  {
    keys: ['recommendation', 'our take', 'picks'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20warm%20neutral%20ribbon%20resting%20beside%20a%20small%20house%20model%20on%20a%20table%2C%20soft%20daylight%2C%20calm%20celebratory%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-picks&orientation=squarish',
  },
  {
    keys: ['from guide to home'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20front%20door%20with%20a%20house%20key%2C%20warm%20potted%20plants%20and%20soft%20daylight%2C%20calm%20welcoming%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-home&orientation=squarish',
  },
  {
    keys: ['amenity', 'amenities'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20a%20well%20serviced%20Nairobi%20neighbourhood%20high%20street%20with%20shops%2C%20a%20pharmacy%20and%20a%20salon%2C%20warm%20daylight%2C%20calm%20everyday%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-amenities&orientation=squarish',
  },
  {
    keys: ['how to read', 'what to look for', 'guide'],
    image:
      'https://readdy.ai/api/search-image?query=Editorial%20photograph%20of%20an%20open%20notebook%20with%20a%20pen%20and%20a%20small%20city%20map%20on%20a%20warm%20wooden%20desk%2C%20soft%20daylight%2C%20calm%20planning%20mood%2C%20clean%20minimal%20composition%2C%20muted%20neutral%20tones&width=600&height=600&seq=blog-section-guide&orientation=squarish',
  },
];

/**
 * Returns a thumbnail image URL for an article section heading. Matching is
 * keyword-based and always returns a usable URL so every heading gets a
 * thumbnail, even ones that match nothing specific.
 */
export function sectionImageFor(heading: string): string {
  if (!heading) return SECTION_FALLBACK_IMAGE;
  const text = heading.toLowerCase();
  for (const rule of SECTION_KEYWORD_IMAGES) {
    if (rule.keys.some((key) => text.includes(key))) return rule.image;
  }
  return SECTION_FALLBACK_IMAGE;
}