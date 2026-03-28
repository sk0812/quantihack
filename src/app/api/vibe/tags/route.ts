import { NextRequest, NextResponse } from 'next/server';
import { sanitiseTags, keywordFallback } from '@/lib/osmTagMap';

export const maxDuration = 30;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3-nano-31b-instruct';

const SYSTEM_PROMPT = `You are an OpenStreetMap tagging expert. Given a neighbourhood description, extract a JSON array of OpenStreetMap tag values.

CRITICAL: Return ONLY a raw JSON array of strings. No markdown, no code fences, no explanation. Just the array.

The ONLY valid values you may use are:
transport: train_station, bus_stop, tram_stop
amenity: cafe, restaurant, pub, bar, library, school, cinema, theatre, fast_food, ice_cream, pharmacy, bank, post_office, place_of_worship, community_centre
leisure: park, garden, playground, fitness_centre, sports_centre, swimming_pool, nature_reserve
shop: bakery, supermarket, convenience, books, florist, butcher, deli, clothes

Mapping rules:
- "train", "station", "tube", "underground", "metro", "rail", "commute", "transit" → train_station
- "bus", "bus stop" → bus_stop
- "tram" → tram_stop
- "sourdough", "bread", "pastry", "artisan" → bakery
- "coffee", "espresso", "latte", "cappuccino" → cafe
- "quiet", "read", "study", "books" → library
- "run", "jog", "cycle", "outdoor" → park
- "workout", "lift", "gym" → fitness_centre
- "kids", "children", "family playground" → playground
- "drinks", "beer", "wine", "real ale" → pub
- "nightlife", "cocktails", "clubbing" → bar
- "groceries", "shopping" → supermarket
- "bookshop", "browse books" → books

Return 3–7 tags maximum. Example output: ["train_station","cafe","library","park"]`;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { vibe } = body as { vibe?: string };

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'OPENROUTER_API_KEY not set in environment', tags: [] },
      { status: 500 }
    );
  }

  const vibeText = vibe?.trim() ?? '';
  if (!vibeText) {
    return NextResponse.json({ error: 'Vibe description required', tags: [] }, { status: 400 });
  }

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lait.local',
        'X-Title': 'LAIT Local Area Intelligence Tool',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Neighbourhood description: "${vibeText}"\n\nJSON array of OSM tags:`,
          },
        ],
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!res.ok) {
      console.error('OpenRouter error:', res.status, await res.text());
      return NextResponse.json({ tags: keywordFallback(vibeText), usedFallback: true });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';

    // Parse the JSON array — strip markdown fences if the model disobeys
    let parsed: unknown = null;
    const clean = content.replace(/```(?:json)?\n?|```/g, '').trim();
    const match = clean.match(/\[[\s\S]*?\]/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch {}
    }
    if (!parsed) {
      try { parsed = JSON.parse(clean); } catch {}
    }

    const tags = sanitiseTags(Array.isArray(parsed) ? parsed : []);
    if (tags.length === 0) {
      return NextResponse.json({ tags: keywordFallback(vibeText), usedFallback: true });
    }

    return NextResponse.json({ tags, usedFallback: false });
  } catch (err) {
    console.error('vibe/tags error:', err);
    return NextResponse.json({ tags: keywordFallback(vibeText), usedFallback: true });
  }
}
