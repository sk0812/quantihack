import { OSM_TAG_MAP, PIVOT_ALTERNATIVES } from './osmTagMap';

export interface VibeTagResult {
  tag: string;
  label: string;
  osmKey: string;
  osmValue: string;
  count: number;
  found: boolean;
  examples: Array<{ name: string; distance: number }>;
}

export interface VibeResult {
  score: number;        // 0–10
  label: string;       // e.g. "Great Match"
  requestedTags: string[];
  tagResults: VibeTagResult[];
  missingTags: string[];
  pivotSuggestions: string[];
}

// Per-tag score: 0 → 0, 1 → 0.5, 2 → 0.8, 3+ → 1.0
function tagScore(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 0.5;
  if (count === 2) return 0.8;
  return 1.0;
}

export function computeVibeScore(tagResults: VibeTagResult[]): number {
  if (tagResults.length === 0) return 0;
  const total = tagResults.reduce((sum, r) => sum + tagScore(r.count), 0);
  return Math.round((total / tagResults.length) * 10 * 10) / 10;
}

export function vibeScoreLabel(score: number): string {
  if (score >= 9) return 'Perfect Match';
  if (score >= 7.5) return 'Great Match';
  if (score >= 5.5) return 'Good Match';
  if (score >= 3.5) return 'Partial Match';
  return 'Poor Match';
}

export function vibeScoreColor(score: number): string {
  if (score >= 7.5) return '#10B981';
  if (score >= 5.5) return '#22C55E';
  if (score >= 3.5) return '#F59E0B';
  return '#EF4444';
}

export interface RawVibeFeature {
  lat: number;
  lon: number;
  name: string;
  osmKey: string;
  osmValue: string;
  vibeTag: string;  // key in OSM_TAG_MAP (e.g. 'train_station', 'cafe')
  distance?: number;
}

export function buildTagResults(
  requestedTags: string[],
  features: RawVibeFeature[],
): VibeTagResult[] {
  return requestedTags.map((tag) => {
    const osm = OSM_TAG_MAP[tag];
    if (!osm) {
      return { tag, label: tag, osmKey: '', osmValue: '', count: 0, found: false, examples: [] };
    }

    const matching = features.filter(
      (f) => f.osmKey === osm.key && f.osmValue === osm.value
    );
    const examples = matching
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, 3)
      .map((f) => ({ name: f.name || osm.label, distance: f.distance ?? 0 }));

    return {
      tag,
      label: osm.label,
      osmKey: osm.key,
      osmValue: osm.value,
      count: matching.length,
      found: matching.length > 0,
      examples,
    };
  });
}

// Rule-based pivot suggestions when LLM isn't available
export function ruleBasedPivots(
  missingTags: string[],
  tagResults: VibeTagResult[],
): string[] {
  const foundTags = new Set(tagResults.filter((r) => r.found).map((r) => r.tag));
  const suggestions: string[] = [];

  for (const missing of missingTags.slice(0, 3)) {
    const alts = (PIVOT_ALTERNATIVES[missing] ?? []).filter((a) => foundTags.has(a));
    const missingLabel = OSM_TAG_MAP[missing]?.label ?? missing;
    if (alts.length > 0) {
      const altLabel = OSM_TAG_MAP[alts[0]]?.label ?? alts[0];
      const altResult = tagResults.find((r) => r.tag === alts[0]);
      const count = altResult?.count ?? 0;
      if (count > 0) {
        suggestions.push(
          `No ${missingLabel} found, but there ${count === 1 ? 'is' : 'are'} ${count} ${altLabel}${count > 1 ? 's' : ''} nearby that might fit`
        );
      }
    } else {
      suggestions.push(`No ${missingLabel} found in this area — try a neighbouring postcode`);
    }
  }

  return suggestions;
}
