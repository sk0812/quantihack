import { NextRequest, NextResponse } from 'next/server';
import {
  LIFESTYLE_TAGS,
  LEGACY_TAGS,
  calculateGentrificationScore,
  gentrificationLabel,
  classifyTags,
} from '@/lib/gentrification';
import type { GentrificationPoint } from '@/lib/gentrification';

export const maxDuration = 60;

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000;

function buildQuery(lat: number, lon: number, radius: number): string {
  const allTags = [...LIFESTYLE_TAGS, ...LEGACY_TAGS];
  const parts = allTags.flatMap(([key, value]) => [
    `node["${key}"="${value}"](around:${radius},${lat},${lon});`,
    `way["${key}"="${value}"](around:${radius},${lat},${lon});`,
  ]);
  return `[out:json][timeout:45];\n(\n  ${parts.join('\n  ')}\n);\nout center tags;`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');
  const radius = parseFloat(searchParams.get('radius') ?? '1000');

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
  }

  const cacheKey = `gent:${lat.toFixed(3)},${lon.toFixed(3)},${radius}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const query = buildQuery(lat, lon, radius);

  for (const mirror of OVERPASS_MIRRORS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 50000);
    try {
      const res = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;

      const data = await res.json();
      const elements: Array<Record<string, unknown>> = data.elements ?? [];

      const seen = new Set<string>();
      const points: GentrificationPoint[] = [];

      for (const el of elements) {
        const elLat = (el.lat as number) ?? (el.center as Record<string, number> | undefined)?.lat;
        const elLon = (el.lon as number) ?? (el.center as Record<string, number> | undefined)?.lon;
        if (!elLat || !elLon) continue;

        const tags = (el.tags ?? {}) as Record<string, string>;
        const cls = classifyTags(tags);
        if (!cls) continue;

        // Deduplicate by name+position
        const key = `${tags.name ?? ''}::${Number(elLat).toFixed(4)},${Number(elLon).toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        points.push({
          lat: elLat,
          lon: elLon,
          name: tags.name ?? '',
          subtype: cls.subtype,
          categoryLabel: cls.label,
        });
      }

      const lifestyleCount = points.filter((p) => p.subtype === 'lifestyle').length;
      const legacyCount = points.filter((p) => p.subtype === 'legacy').length;
      const score = calculateGentrificationScore(lifestyleCount, legacyCount);
      const label = score !== null ? gentrificationLabel(score) : 'Insufficient Data';

      const result = { score, label, lifestyleCount, legacyCount, points };
      cache.set(cacheKey, { data: result, ts: Date.now() });
      return NextResponse.json(result);
    } catch {
      clearTimeout(timer);
      continue;
    }
  }

  return NextResponse.json({ error: 'Overpass timeout', score: null, points: [] }, { status: 504 });
}
