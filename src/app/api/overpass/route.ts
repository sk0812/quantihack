import { NextRequest, NextResponse } from 'next/server';

// Allow up to 60s for this route — Overpass can be slow
export const maxDuration = 60;

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// Simple in-memory cache: avoids hammering Overpass and hitting rate limits
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function cacheKey(lat: string, lon: string, radius: string) {
  // Round to 3dp so nearby searches reuse the same result
  return `${parseFloat(lat).toFixed(3)},${parseFloat(lon).toFixed(3)},${radius}`;
}

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat');
  const lon = request.nextUrl.searchParams.get('lon');
  const radius = request.nextUrl.searchParams.get('radius') ?? '1000';

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
  }

  // Serve from cache if fresh
  const key = cacheKey(lat, lon, radius);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const r = radius;
  const query = `
[out:json][timeout:50];
(
  node["amenity"="cafe"](around:${r},${lat},${lon});
  node["amenity"="restaurant"](around:${r},${lat},${lon});
  node["amenity"="pub"](around:${r},${lat},${lon});
  node["amenity"="bar"](around:${r},${lat},${lon});
  node["amenity"="fast_food"](around:${r},${lat},${lon});
  node["amenity"="school"](around:${r},${lat},${lon});
  way["amenity"="school"](around:${r},${lat},${lon});
  node["amenity"="college"](around:${r},${lat},${lon});
  way["amenity"="college"](around:${r},${lat},${lon});
  node["amenity"="university"](around:${r},${lat},${lon});
  way["amenity"="university"](around:${r},${lat},${lon});
  node["shop"="supermarket"](around:${r},${lat},${lon});
  node["shop"="convenience"](around:${r},${lat},${lon});
  node["leisure"="fitness_centre"](around:${r},${lat},${lon});
  node["leisure"="park"](around:${r},${lat},${lon});
  way["leisure"="park"](around:${r},${lat},${lon});
  relation["leisure"="park"](around:${r},${lat},${lon});
  node["railway"="station"](around:${r},${lat},${lon});
  node["railway"="halt"](around:${r},${lat},${lon});
  node["station"="subway"](around:${r},${lat},${lon});
  node["railway"="tram_stop"](around:${r},${lat},${lon});
  node["highway"="bus_stop"](around:${r},${lat},${lon});
);
out center tags;
`;

  // Try each mirror in turn
  for (const mirrorUrl of OVERPASS_MIRRORS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000);

    try {
      const response = await fetch(mirrorUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) continue; // try next mirror

      const data = await response.json();
      cache.set(key, { data, ts: Date.now() });
      return NextResponse.json(data);
    } catch (err) {
      clearTimeout(timeout);
      // Try next mirror on abort or network error
      continue;
    }
  }

  return NextResponse.json({ error: 'All Overpass mirrors failed', elements: [] }, { status: 504 });
}
