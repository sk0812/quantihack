import { NextRequest, NextResponse } from 'next/server';
import { ruleBasedPivots } from '@/lib/vibeScoring';
import type { VibeTagResult } from '@/lib/vibeScoring';

export const maxDuration = 30;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3-nano-31b-instruct';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { vibe, tagResults } = body as {
    vibe?: string;
    tagResults?: VibeTagResult[];
  };

  const key = process.env.OPENROUTER_API_KEY;
  const results: VibeTagResult[] = tagResults ?? [];
  const missingTags = results.filter((r) => !r.found).map((r) => r.tag);

  if (missingTags.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  // No API key — use rule-based
  if (!key) {
    return NextResponse.json({
      suggestions: ruleBasedPivots(missingTags, results),
      usedFallback: true,
    });
  }

  const foundSummary = results
    .filter((r) => r.found)
    .map((r) => `${r.label} (${r.count} found)`)
    .join(', ') || 'nothing notable';

  const missingLabels = results
    .filter((r) => !r.found)
    .map((r) => r.label)
    .join(', ');

  const prompt = `The user was looking for: "${vibe ?? 'a specific vibe'}"

They wanted: ${missingLabels} — but NONE were found nearby.
What IS available: ${foundSummary}.

Write ${Math.min(missingTags.length, 2)} short, friendly pivot suggestions (max 30 words each). Be specific about what's available and suggest how it could substitute for what's missing.

Return ONLY a JSON array of strings. Example: ["No bakeries, but 3 cafés here likely serve fresh pastries","The parks nearby offer the peaceful outdoor space you wanted"]`;

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
          {
            role: 'system',
            content: 'You are a helpful neighbourhood advisor. Return ONLY a JSON array of strings. No markdown, no explanation.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 200,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({
        suggestions: ruleBasedPivots(missingTags, results),
        usedFallback: true,
      });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';
    const clean = content.replace(/```(?:json)?\n?|```/g, '').trim();
    const match = clean.match(/\[[\s\S]*?\]/);

    let suggestions: string[] = [];
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          suggestions = parsed.filter((s): s is string => typeof s === 'string').slice(0, 3);
        }
      } catch {}
    }

    if (suggestions.length === 0) {
      return NextResponse.json({
        suggestions: ruleBasedPivots(missingTags, results),
        usedFallback: true,
      });
    }

    return NextResponse.json({ suggestions, usedFallback: false });
  } catch {
    return NextResponse.json({
      suggestions: ruleBasedPivots(missingTags, results),
      usedFallback: true,
    });
  }
}
