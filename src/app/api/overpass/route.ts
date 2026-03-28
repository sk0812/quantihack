import { NextRequest, NextResponse } from 'next/server';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat');
  const lon = request.nextUrl.searchParams.get('lon');
  const radius = request.nextUrl.searchParams.get('radius') ?? '1000';

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
  }

  const r = radius;
  const query = `
[out:json][timeout:25];
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
out center;
`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: 'Overpass API error' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Overpass timeout' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Failed to fetch OSM data' }, { status: 500 });
  }
}
