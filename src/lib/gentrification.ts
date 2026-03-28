export type GentrificationSubtype = 'lifestyle' | 'legacy';

export interface GentrificationPoint {
  lat: number;
  lon: number;
  name: string;
  subtype: GentrificationSubtype;
  categoryLabel: string;
}

export interface GentrificationResult {
  score: number | null;  // null = insufficient data
  label: string;
  lifestyleCount: number;
  legacyCount: number;
  points: GentrificationPoint[];
}

// Lifestyle (hip) OSM tag definitions
export const LIFESTYLE_TAGS: Array<[key: string, value: string, label: string]> = [
  ['amenity', 'cafe',            'Café'],
  ['amenity', 'arts_centre',     'Arts Centre'],
  ['amenity', 'studio',          'Studio'],
  ['amenity', 'wine_bar',        'Wine Bar'],
  ['amenity', 'coworking_space', 'Coworking Space'],
  ['tourism', 'gallery',         'Art Gallery'],
  ['office',  'coworking',       'Coworking'],
  ['shop',    'health_food',     'Health Food'],
  ['shop',    'organic',         'Organic Shop'],
  ['shop',    'deli',            'Deli'],
  ['shop',    'wine',            'Wine Shop'],
  ['shop',    'boutique',        'Boutique'],
  ['shop',    'art',             'Art Shop'],
  ['craft',   'distillery',      'Distillery'],
  ['craft',   'brewery',         'Brewery'],
];

// Legacy (traditional) OSM tag definitions
export const LEGACY_TAGS: Array<[key: string, value: string, label: string]> = [
  ['shop',    'laundry',       'Laundry'],
  ['shop',    'dry_cleaning',  'Dry Cleaning'],
  ['shop',    'pawnbroker',    'Pawnbroker'],
  ['shop',    'bookmaker',     'Bookmaker'],
  ['amenity', 'bookmaker',     'Bookmaker'],
  ['shop',    'hardware',      'Hardware Store'],
  ['shop',    'doityourself',  'DIY Store'],
  ['shop',    'greengrocer',   'Greengrocer'],
  ['shop',    'newsagent',     'Newsagent'],
  ['shop',    'charity',       'Charity Shop'],
];

// Sigmoid: k=0.8, midpoint at R=1
// R=0 → ~3.1, R=1 → 5.0, R=3 → ~8.3, R=5 → ~9.6
function sigmoid(R: number): number {
  return 10 / (1 + Math.exp(-0.8 * (R - 1)));
}

// Core scoring: C2L ratio → sigmoid → density-weighted 0–10
export function calculateGentrificationScore(L: number, S: number): number | null {
  if (L + S === 0) return null;
  const R = L / (S + 1);
  const densityFactor = (L + S) < 5 ? 0.5 : 1.0;
  const raw = sigmoid(R) * densityFactor;
  return Math.min(10, Math.max(0, Math.round(raw * 10) / 10));
}

export function gentrificationLabel(score: number): string {
  if (score >= 7) return 'Full Saturation';
  if (score >= 4) return 'Active Transition';
  return 'Legacy Core';
}

export function gentrificationColor(score: number): string {
  if (score >= 7) return '#EAB308';  // gold
  if (score >= 4) return '#F59E0B';  // amber
  return '#6B7280';                   // grey
}

export function classifyTags(
  tags: Record<string, string>
): { subtype: GentrificationSubtype; label: string } | null {
  for (const [key, value, label] of LIFESTYLE_TAGS) {
    if (tags[key] === value) return { subtype: 'lifestyle', label };
  }
  for (const [key, value, label] of LEGACY_TAGS) {
    if (tags[key] === value) return { subtype: 'legacy', label };
  }
  return null;
}
