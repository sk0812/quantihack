export interface BiophiliaPoint {
  lat: number;
  lon: number;
  name: string;
  category: 'nature' | 'stressor';
  weight: number;
  label: string;
}

export interface BiophiliaResult {
  score: number;
  mathScore: number;
  aiScore: number | null;
  aiReason: string | null;
  label: string;
  natureWeight: number;
  stressorPenalty: number;
  points: BiophiliaPoint[];
}

// Nature tags: [key, value, weight, label]
export const NATURE_TAGS: Array<[string, string, number, string]> = [
  ['natural',  'wood',               5, 'Woodland'],
  ['leisure',  'nature_reserve',     5, 'Nature Reserve'],
  ['leisure',  'park',               3, 'Park'],
  ['leisure',  'garden',             3, 'Garden'],
  ['natural',  'water',              4, 'Water Body'],
  ['waterway', 'river',              4, 'River'],
  ['landuse',  'grass',              1, 'Grassland'],
  ['leisure',  'recreation_ground',  1, 'Recreation Ground'],
];

// Acoustic stressor tags: [key, value, penalty, label]
export const STRESSOR_TAGS: Array<[string, string, number, string]> = [
  ['highway', 'motorway',  5, 'Motorway'],
  ['highway', 'trunk',     5, 'Trunk Road'],
  ['highway', 'primary',   3, 'Primary Road'],
  ['highway', 'secondary', 3, 'Secondary Road'],
  ['railway', 'rail',      4, 'Railway'],
];

const DECAY_THRESHOLD_M = 1000;
const DECAY_FACTOR = 0.5;

export function applyDecay(weight: number, distanceMeters: number): number {
  return distanceMeters > DECAY_THRESHOLD_M ? weight * DECAY_FACTOR : weight;
}

// Sigmoid centred at raw=0 → score=5; wider band (÷8) gives ±8 raw ≈ ±1.8 score
function sigmoid(raw: number): number {
  return 10 / (1 + Math.exp(-raw / 8));
}

export function calculateMathScore(natureTotal: number, stressorTotal: number): number {
  const raw = natureTotal - stressorTotal;
  return Math.round(sigmoid(raw) * 10) / 10;
}

export function combinedScore(mathScore: number, aiScore: number): number {
  return Math.round((0.7 * mathScore + 0.3 * aiScore) * 10) / 10;
}

export function biophiliaLabel(score: number): string {
  if (score >= 8) return 'Deep Sanctuary';
  if (score >= 5) return 'Balanced Urban';
  return 'Grey Desert';
}

export function biophiliaColor(score: number): string {
  if (score >= 8) return '#10B981'; // emerald
  if (score >= 5) return '#F59E0B'; // amber
  return '#6B7280';                 // grey
}

export function classifyBiophilia(
  tags: Record<string, string>
): { category: 'nature' | 'stressor'; weight: number; label: string } | null {
  for (const [key, value, weight, label] of NATURE_TAGS) {
    if (tags[key] === value) return { category: 'nature', weight, label };
  }
  for (const [key, value, penalty, label] of STRESSOR_TAGS) {
    if (tags[key] === value) return { category: 'stressor', weight: penalty, label };
  }
  return null;
}
