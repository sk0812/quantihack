export interface OsmTag {
  key: 'amenity' | 'leisure' | 'shop' | 'highway' | 'railway';
  value: string;
  label: string; // human-readable
}

// Canonical map: what the LLM is allowed to return → how to query Overpass
export const OSM_TAG_MAP: Record<string, OsmTag> = {
  // transport
  train_station:    { key: 'railway', value: 'station',   label: 'Train Station' },
  bus_stop:         { key: 'highway', value: 'bus_stop',  label: 'Bus Stop' },
  tram_stop:        { key: 'railway', value: 'tram_stop', label: 'Tram Stop' },
  // amenity
  cafe:             { key: 'amenity', value: 'cafe',             label: 'Café' },
  restaurant:       { key: 'amenity', value: 'restaurant',       label: 'Restaurant' },
  pub:              { key: 'amenity', value: 'pub',              label: 'Pub' },
  bar:              { key: 'amenity', value: 'bar',              label: 'Bar' },
  library:          { key: 'amenity', value: 'library',          label: 'Library' },
  school:           { key: 'amenity', value: 'school',           label: 'School' },
  cinema:           { key: 'amenity', value: 'cinema',           label: 'Cinema' },
  theatre:          { key: 'amenity', value: 'theatre',          label: 'Theatre' },
  fast_food:        { key: 'amenity', value: 'fast_food',        label: 'Fast Food' },
  ice_cream:        { key: 'amenity', value: 'ice_cream',        label: 'Ice Cream' },
  pharmacy:         { key: 'amenity', value: 'pharmacy',         label: 'Pharmacy' },
  bank:             { key: 'amenity', value: 'bank',             label: 'Bank' },
  post_office:      { key: 'amenity', value: 'post_office',      label: 'Post Office' },
  place_of_worship: { key: 'amenity', value: 'place_of_worship', label: 'Place of Worship' },
  community_centre: { key: 'amenity', value: 'community_centre', label: 'Community Centre' },
  // leisure
  park:             { key: 'leisure', value: 'park',             label: 'Park' },
  garden:           { key: 'leisure', value: 'garden',           label: 'Garden' },
  playground:       { key: 'leisure', value: 'playground',       label: 'Playground' },
  fitness_centre:   { key: 'leisure', value: 'fitness_centre',   label: 'Gym / Fitness Centre' },
  sports_centre:    { key: 'leisure', value: 'sports_centre',    label: 'Sports Centre' },
  swimming_pool:    { key: 'leisure', value: 'swimming_pool',    label: 'Swimming Pool' },
  nature_reserve:   { key: 'leisure', value: 'nature_reserve',   label: 'Nature Reserve' },
  // shop
  bakery:           { key: 'shop',    value: 'bakery',           label: 'Bakery' },
  supermarket:      { key: 'shop',    value: 'supermarket',      label: 'Supermarket' },
  convenience:      { key: 'shop',    value: 'convenience',      label: 'Convenience Store' },
  books:            { key: 'shop',    value: 'books',            label: 'Bookshop' },
  florist:          { key: 'shop',    value: 'florist',          label: 'Florist' },
  butcher:          { key: 'shop',    value: 'butcher',          label: 'Butcher' },
  deli:             { key: 'shop',    value: 'deli',             label: 'Deli' },
  clothes:          { key: 'shop',    value: 'clothes',          label: 'Clothing Shop' },
};

// For pivot suggestions: if tag X is missing, these alternatives might satisfy the user
export const PIVOT_ALTERNATIVES: Record<string, string[]> = {
  bakery:           ['cafe', 'deli'],
  library:          ['community_centre', 'books', 'cafe'],
  cinema:           ['theatre', 'bar', 'pub'],
  swimming_pool:    ['sports_centre', 'fitness_centre'],
  nature_reserve:   ['park', 'garden'],
  deli:             ['bakery', 'butcher', 'convenience'],
  books:            ['library', 'cafe'],
  garden:           ['park', 'nature_reserve'],
  sports_centre:    ['fitness_centre', 'park'],
  ice_cream:        ['cafe', 'bakery'],
  playground:       ['park', 'sports_centre'],
  place_of_worship: ['community_centre'],
  community_centre: ['library', 'place_of_worship'],
  theatre:          ['cinema', 'pub'],
  fast_food:        ['restaurant', 'cafe', 'convenience'],
};

export const VALID_TAGS = new Set(Object.keys(OSM_TAG_MAP));

// Sanitise LLM output: keep only valid tags
export function sanitiseTags(raw: unknown[]): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.toLowerCase().trim().replace(/\s+/g, '_'))
    .filter((t) => VALID_TAGS.has(t))
    .slice(0, 8);
}

// Keyword-based fallback if LLM fails
const KEYWORD_HINTS: Record<string, string> = {
  coffee: 'cafe', sourdough: 'bakery', bread: 'bakery', book: 'books',
  reading: 'library', quiet: 'library', green: 'park', nature: 'park',
  workout: 'fitness_centre', gym: 'fitness_centre', swim: 'swimming_pool',
  kids: 'playground', children: 'playground', drinks: 'pub', nightlife: 'bar',
  food: 'restaurant', groceries: 'supermarket', fresh: 'bakery',
  flowers: 'florist', fish: 'butcher', meat: 'butcher',
  train: 'train_station', station: 'train_station', tube: 'train_station',
  underground: 'train_station', metro: 'train_station', rail: 'train_station',
  commute: 'train_station', transit: 'train_station', transport: 'train_station',
  bus: 'bus_stop', tram: 'tram_stop',
};

export function keywordFallback(vibe: string): string[] {
  const lower = vibe.toLowerCase();
  const found = new Set<string>();
  for (const [word, tag] of Object.entries(KEYWORD_HINTS)) {
    if (lower.includes(word)) found.add(tag);
  }
  // also direct tag name matches
  for (const tag of VALID_TAGS) {
    if (lower.includes(tag)) found.add(tag);
  }
  return [...found].slice(0, 6);
}
