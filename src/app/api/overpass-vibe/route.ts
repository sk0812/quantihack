import { NextRequest, NextResponse } from 'next/server';
import { OSM_TAG_MAP } from '@/lib/osmTagMap';

export const maxDuration = 60;

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// In-memory cache for vibe queries
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

// POST — accepts { lat, lon, radius, tags[] } as JSON body
// (POST avoids URL-length limits for many tags)
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { lat, lon, radius = '1500', tags: rawTags = [] } = body as {
    lat?: string | number;
    lon?: string | number;
    radius?: string | number;
    tags?: string[];
  };

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat/lon', elements: [] }, { status: 400 });
  }

  const tags = rawTags
    .map((t) => String(t).toLowerCase().trim())
    .filter((t) => OSM_TAG_MAP[t]);

  if (tags.length === 0) {
    return NextResponse.json({ error: 'No valid tags', elements: [] }, { status: 400 });
  }

  const cacheKey = `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)},${radius},${tags.sort().join(',')}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // Build union query — node + way for every requested tag
  const parts = tags.flatMap((tag) => {
    const osm = OSM_TAG_MAP[tag];
    return [
      `node["${osm.key}"="${osm.value}"](around:${radius},${lat},${lon});`,
      `way["${osm.key}"="${osm.value}"](around:${radius},${lat},${lon});`,
    ];
  });

  const query = `[out:json][timeout:50];\n(\n  ${parts.join('\n  ')}\n);\nout center tags;`;

  for (const mirrorUrl of OVERPASS_MIRRORS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 50000);

    try {
      const res = await fetch(mirrorUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;

      const data = await res.json();
      const elements = data.elements ?? [];

      // Annotate each element with the vibe tag it matched
      // An element's OSM tags are in el.tags (present for both nodes and ways with out center tags;)
      const annotated = elements.map((el: Record<string, unknown>) => {
        const elTags = (el.tags ?? {}) as Record<string, string>;
        let matchedTag = '';
        for (const tag of tags) {
          const osm = OSM_TAG_MAP[tag];
          if (elTags[osm.key] === osm.value) {
            matchedTag = tag;
            break;
          }
        }
        return { ...el, _vibeTag: matchedTag };
      });

      const result = { elements: annotated };
      cache.set(cacheKey, { data: result, ts: Date.now() });
      return NextResponse.json(result);
    } catch {
      clearTimeout(timer);
      continue;
    }
  }

  return NextResponse.json({ error: 'Overpass timeout', elements: [] }, { status: 504 });
}
