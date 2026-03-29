import { NextRequest, NextResponse } from 'next/server';
import {
  NATURE_TAGS,
  STRESSOR_TAGS,
  classifyBiophilia,
  applyDecay,
  calculateMathScore,
  combinedScore,
  biophiliaLabel,
} from '@/lib/biophilia';
import type { BiophiliaPoint } from '@/lib/biophilia';

export const maxDuration = 60;

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3-nano-31b-instruct';

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000;

function buildQuery(lat: number, lon: number, radius: number): string {
  const natureParts = NATURE_TAGS.flatMap(([key, value]) => [
    `node["${key}"="${value}"](around:${radius},${lat},${lon});`,
    `way["${key}"="${value}"](around:${radius},${lat},${lon});`,
  ]);
  const stressorParts = STRESSOR_TAGS.flatMap(([key, value]) => [
    `way["${key}"="${value}"](around:${radius},${lat},${lon});`,
  ]);
  return `[out:json][timeout:45];\n(\n  ${[...natureParts, ...stressorParts].join('\n  ')}\n);\nout center tags;`;
}

function haversineDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');
  const radius = parseFloat(searchParams.get('radius') ?? '1000');

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
  }

  const cacheKey = `bio:${lat.toFixed(3)},${lon.toFixed(3)},${radius}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const query = buildQuery(lat, lon, radius);
  let elements: Array<Record<string, unknown>> = [];

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
      elements = data.elements ?? [];
      break;
    } catch {
      clearTimeout(timer);
      continue;
    }
  }

  // ── Process elements ───────────────────────────────────────────────────────
  const seen = new Set<string>();
  const points: BiophiliaPoint[] = [];
  let natureTotal = 0;
  let stressorTotal = 0;

  for (const el of elements) {
    const elLat =
      (el.lat as number | undefined) ??
      (el.center as Record<string, number> | undefined)?.lat;
    const elLon =
      (el.lon as number | undefined) ??
      (el.center as Record<string, number> | undefined)?.lon;
    if (!elLat || !elLon) continue;

    const tags = (el.tags ?? {}) as Record<string, string>;
    const cls = classifyBiophilia(tags);
    if (!cls) continue;

    const key = `${cls.label}::${elLat.toFixed(4)},${elLon.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const distance = haversineDist(lat, lon, elLat, elLon);
    const decayedWeight = applyDecay(cls.weight, distance);

    if (cls.category === 'nature') {
      natureTotal += decayedWeight;
    } else {
      stressorTotal += decayedWeight;
    }

    points.push({
      lat: elLat,
      lon: elLon,
      name: tags.name ?? '',
      category: cls.category,
      weight: cls.weight,
      label: cls.label,
    });
  }

  const mathScore = calculateMathScore(natureTotal, stressorTotal);

  // ── AI scoring via Nemotron ────────────────────────────────────────────────
  let aiScore: number | null = null;
  let aiReason: string | null = null;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) {
    const natureList = points
      .filter((p) => p.category === 'nature')
      .slice(0, 12)
      .map((p) => (p.name ? `${p.name} (${p.label})` : p.label))
      .join(', ');

    const stressorTypes = [
      ...new Set(points.filter((p) => p.category === 'stressor').map((p) => p.label)),
    ].join(', ');

    const prompt = `Given these local features near a UK postcode:
Nature assets: ${natureList || 'None found'}
Nearby road/rail types: ${stressorTypes || 'None found'}

Act as an environmental psychologist. Rate the 'Restorative Quality' of this area from 1-10 based on Attention Restoration Theory (ART). Return ONLY a JSON object: {"psych_score": float, "reason": string}`;

    try {
      const aiRes = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://lait.local',
          'X-Title': 'LAIT Local Area Intelligence Tool',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 200,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const content: string = aiData.choices?.[0]?.message?.content ?? '';
        const clean = content.replace(/```(?:json)?\n?|```/g, '').trim();
        const match = clean.match(/\{[\s\S]*?\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]) as { psych_score?: unknown; reason?: unknown };
            if (typeof parsed.psych_score === 'number') {
              aiScore = Math.min(10, Math.max(0, parsed.psych_score));
              aiReason = typeof parsed.reason === 'string' ? parsed.reason : null;
            }
          } catch {
            // ignore parse error
          }
        }
      }
    } catch {
      // AI call failed — fall through with null
    }
  }

  const finalScore = aiScore !== null ? combinedScore(mathScore, aiScore) : mathScore;

  const result = {
    score: finalScore,
    mathScore,
    aiScore,
    aiReason,
    label: biophiliaLabel(finalScore),
    natureWeight: Math.round(natureTotal * 10) / 10,
    stressorPenalty: Math.round(stressorTotal * 10) / 10,
    points,
  };

  cache.set(cacheKey, { data: result, ts: Date.now() });
  return NextResponse.json(result);
}
