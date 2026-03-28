'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import PostcodeSearch from '@/components/PostcodeSearch';
import AreaHeader from '@/components/AreaHeader';
import ScorePanel from '@/components/ScorePanel';
import InsightsPanel from '@/components/InsightsPanel';
import VibeSearch from '@/components/VibeSearch';
import VibeResultsPanel from '@/components/VibeResultsPanel';
import { PostcodeData, AmenityPoint, CrimePoint, FilterState, Scores } from '@/lib/types';
import { countAmenities, computeScores } from '@/lib/scoring';
import { generateInsights } from '@/lib/insights';
import { haversineDistance } from '@/lib/utils';
import { RADIUS_METERS, OUTCODE_RADIUS_METERS } from '@/lib/constants';
import { OSM_TAG_MAP } from '@/lib/osmTagMap';
import {
  buildTagResults,
  computeVibeScore,
  ruleBasedPivots,
  type VibeResult,
  type RawVibeFeature,
} from '@/lib/vibeScoring';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#e8ecf0' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#3B82F6', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: '#9ca3af' }}>Loading map…</p>
      </div>
    </div>
  ),
});

interface OSMNode {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
  _vibeTag?: string;
}

function parseOSMAmenities(
  elements: OSMNode[],
  centerLat: number,
  centerLon: number,
  radiusMeters: number,
): AmenityPoint[] {
  const results: AmenityPoint[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!lat || !lon) continue;

    const tags = el.tags ?? {};
    const name = tags.name ?? '';

    let type: AmenityPoint['type'] | null = null;
    let category: AmenityPoint['category'] = 'amenity';

    if (tags.amenity === 'cafe') type = 'cafe';
    else if (tags.amenity === 'restaurant') type = 'restaurant';
    else if (tags.amenity === 'pub' || tags.amenity === 'bar') type = 'pub';
    else if (tags.amenity === 'fast_food') type = 'restaurant';
    else if (tags.shop === 'supermarket') type = 'supermarket';
    else if (tags.shop === 'convenience') type = 'convenience';
    else if (tags.leisure === 'fitness_centre') type = 'gym';
    else if (tags.leisure === 'park') type = 'park';
    else if (tags.amenity === 'school') type = 'school';
    else if (tags.amenity === 'college') type = 'college';
    else if (tags.amenity === 'university') type = 'university';
    else if (
      tags.railway === 'station' || tags.railway === 'halt' ||
      tags.station === 'subway' || tags.railway === 'tram_stop'
    ) {
      type = tags.station === 'subway' ? 'subway' : 'station';
      category = 'transport';
    }
    else if (tags.highway === 'bus_stop') { type = 'bus_stop'; category = 'transport'; }

    if (!type) continue;

    const key = `${type}::${name || `${lat.toFixed(5)},${lon.toFixed(5)}`}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const distance = haversineDistance(centerLat, centerLon, lat, lon);
    if (distance > radiusMeters) continue;

    results.push({ id: el.id, lat, lon, name, type, category, distance });
  }

  return results;
}

type RightTab = 'insights' | 'vibe';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [postcodeData, setPostcodeData] = useState<PostcodeData | null>(null);
  const [amenities, setAmenities] = useState<AmenityPoint[]>([]);
  const [crimes, setCrimes] = useState<CrimePoint[]>([]);
  const [scores, setScores] = useState<Scores | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeRadius, setActiveRadius] = useState(RADIUS_METERS);

  const [vibeLoading, setVibeLoading] = useState(false);
  const [vibeExtractedTags, setVibeExtractedTags] = useState<string[]>([]);
  const [vibeResult, setVibeResult] = useState<VibeResult | null>(null);
  const [vibeText, setVibeText] = useState('');
  const [vibeMatchTags, setVibeMatchTags] = useState<Set<string>>(new Set());
  const [vibeAmenities, setVibeAmenities] = useState<RawVibeFeature[]>([]);
  const [rightTab, setRightTab] = useState<RightTab>('insights');

  const [filters, setFilters] = useState<FilterState>({
    transport: true,
    amenity: true,
    safety: true,
  });

  const handleFilterToggle = useCallback((key: keyof FilterState) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Postcode search ──────────────────────────────────────────────────────
  const handleSearch = useCallback(async (postcode: string) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const pcRes = await fetch(`/api/postcode?postcode=${encodeURIComponent(postcode)}`);
      const pcData = await pcRes.json();

      if (!pcRes.ok) {
        setErrorMessage(pcData.error || 'Postcode not found');
        setIsLoading(false);
        return;
      }

      const pd: PostcodeData = pcData;
      setPostcodeData(pd);
      const radius = pd.isOutcode ? OUTCODE_RADIUS_METERS : RADIUS_METERS;
      setActiveRadius(radius);

      let parsedAmenities: AmenityPoint[] = [];
      try {
        const osmRes = await fetch(
          `/api/overpass?lat=${pd.latitude}&lon=${pd.longitude}&radius=${radius}`
        );
        if (osmRes.ok) {
          const osmData = await osmRes.json();
          parsedAmenities = parseOSMAmenities(
            osmData.elements ?? [],
            pd.latitude,
            pd.longitude,
            radius
          );
        } else {
          const { generateMockAmenities } = await import('@/lib/mockData');
          parsedAmenities = generateMockAmenities(postcode, pd.latitude, pd.longitude);
        }
      } catch {
        const { generateMockAmenities } = await import('@/lib/mockData');
        parsedAmenities = generateMockAmenities(postcode, pd.latitude, pd.longitude);
      }

      let parsedCrimes: CrimePoint[] = [];
      try {
        const crimesRes = await fetch(
          `/api/crimes?lat=${pd.latitude}&lon=${pd.longitude}&radius=${radius}`
        );
        if (crimesRes.ok) {
          const crimesData = await crimesRes.json();
          parsedCrimes = crimesData.crimes ?? [];
        }
      } catch {
        // leave parsedCrimes empty if fetch fails
      }

      setAmenities(parsedAmenities);
      setCrimes(parsedCrimes);
      setScores(computeScores(countAmenities(parsedAmenities, parsedCrimes)));
      setVibeResult(null);
      setVibeExtractedTags([]);
      setVibeMatchTags(new Set());
      setVibeAmenities([]);
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Vibe search ──────────────────────────────────────────────────────────
  const handleVibeSearch = useCallback(async (vibe: string) => {
    if (!postcodeData) return;
    setVibeLoading(true);
    setVibeText(vibe);
    setVibeResult(null);
    setVibeExtractedTags([]);
    setRightTab('vibe');

    try {
      // Step 1: Extract OSM tags via LLM (API key is server-side only)
      const tagsRes = await fetch('/api/vibe/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vibe }),
      });
      const tagsData = await tagsRes.json();
      const extractedTags: string[] = tagsData.tags ?? [];
      setVibeExtractedTags(extractedTags);

      if (extractedTags.length === 0) {
        setVibeLoading(false);
        return;
      }

      // Step 2: POST to overpass-vibe with tags as JSON body (avoids URL-length limits)
      const vibeRadius = Math.max(activeRadius, 1500);
      const overpassRes = await fetch('/api/overpass-vibe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: postcodeData.latitude,
          lon: postcodeData.longitude,
          radius: vibeRadius,
          tags: extractedTags,
        }),
      });

      let rawFeatures: RawVibeFeature[] = [];
      if (overpassRes.ok) {
        const overpassData = await overpassRes.json();
        rawFeatures = (overpassData.elements ?? [])
          .filter((el: OSMNode) => el._vibeTag)
          .map((el: OSMNode) => {
            const lat = el.lat ?? el.center?.lat ?? 0;
            const lon = el.lon ?? el.center?.lon ?? 0;
            const osm = OSM_TAG_MAP[el._vibeTag!];
            return {
              lat,
              lon,
              name: el.tags?.name ?? '',
              osmKey: osm?.key ?? '',
              osmValue: osm?.value ?? '',
              vibeTag: el._vibeTag!,
              distance: haversineDistance(
                postcodeData.latitude,
                postcodeData.longitude,
                lat,
                lon
              ),
            } satisfies RawVibeFeature;
          });
      }

      // Step 3: Score
      const tagResults = buildTagResults(extractedTags, rawFeatures);
      const score = computeVibeScore(tagResults);
      const missingTags = tagResults.filter((r) => !r.found).map((r) => r.tag);

      // Step 4: Pivot suggestions (LLM or rule-based fallback)
      let pivotSuggestions: string[] = [];
      if (missingTags.length > 0) {
        try {
          const pivotRes = await fetch('/api/vibe/pivot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vibe, tagResults }),
          });
          const pivotData = await pivotRes.json();
          pivotSuggestions = pivotData.suggestions ?? [];
        } catch {
          pivotSuggestions = ruleBasedPivots(missingTags, tagResults);
        }
      }

      setVibeResult({
        score,
        label: '',
        requestedTags: extractedTags,
        tagResults,
        missingTags,
        pivotSuggestions,
      });

      setVibeMatchTags(
        new Set(tagResults.filter((r) => r.found).map((r) => r.osmValue))
      );
      setVibeAmenities(rawFeatures);
    } catch (err) {
      console.error('Vibe search error:', err);
    } finally {
      setVibeLoading(false);
    }
  }, [postcodeData, activeRadius]);

  // ── Derived state ────────────────────────────────────────────────────────
  const mapCenter: [number, number] | null = postcodeData
    ? [postcodeData.latitude, postcodeData.longitude]
    : null;

  const filterCounts = useMemo(() => ({
    transport: amenities.filter((a) => a.category === 'transport').length,
    amenity: amenities.filter((a) => a.category === 'amenity').length,
    safety: crimes.length,
  }), [amenities, crimes]);

  const insights = useMemo(() => {
    if (!scores) return [];
    return generateInsights(countAmenities(amenities, crimes));
  }, [scores, amenities, crimes]);

  const nearbyHighlights = useMemo(() =>
    amenities
      .filter((a) => a.category === 'amenity')
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, 3)
      .map((a) => ({ name: a.name || a.type, type: a.type, distance: a.distance ?? 0 }))
  , [amenities]);

  const nearestStation = useMemo(() => {
    const stations = amenities.filter((a) => a.type === 'station' || a.type === 'subway');
    return stations.length
      ? stations.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))[0]
      : null;
  }, [amenities]);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar ─────────────────────────────────────── */}
        <aside
          className="w-80 shrink-0 flex flex-col overflow-hidden border-r"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          {/* Header */}
          <div
            className="flex items-center px-5 py-4 border-b shrink-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.1)' }}
              >
                <MapPin size={16} style={{ color: '#3B82F6' }} />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  LAIT
                </span>
                <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>
                  Local Intelligence
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <PostcodeSearch onSearch={handleSearch} isLoading={isLoading} />

            {errorMessage && (
              <div
                className="px-3 py-2.5 rounded-xl text-xs"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#DC2626',
                }}
              >
                {errorMessage}
              </div>
            )}

            <AreaHeader postcodeData={postcodeData} />
            <ScorePanel scores={scores} isLoading={isLoading} />
            <VibeSearch
              hasPostcode={!!postcodeData}
              isLoading={vibeLoading}
              onSearch={handleVibeSearch}
            />
          </div>
        </aside>

        {/* ── Map ──────────────────────────────────────────────── */}
        <main className="flex-1 relative overflow-hidden">
          <MapView
            center={mapCenter}
            amenities={amenities}
            crimes={crimes}
            filters={filters}
            filterCounts={filterCounts}
            onFilterToggle={handleFilterToggle}
            overallScore={scores?.overall ?? null}
            radius={activeRadius}
            isOutcode={postcodeData?.isOutcode ?? false}
            vibeMatchTags={vibeMatchTags}
            vibeAmenities={vibeAmenities}
          />
        </main>

        {/* ── Right panel ──────────────────────────────────────── */}
        <aside
          className="w-72 shrink-0 flex flex-col overflow-hidden border-l"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          {/* Tab bar */}
          <div className="flex shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
            {(['insights', 'vibe'] as RightTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className="flex-1 py-3 text-xs font-semibold transition-all relative"
                style={{
                  color: rightTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: rightTab === tab ? 'var(--bg-tertiary)' : 'transparent',
                }}
              >
                {tab === 'insights' ? 'Area Insights' : (
                  <span className="flex items-center justify-center gap-1.5">
                    Vibe Match
                    {(vibeResult || vibeLoading) && (
                      <span
                        className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{ background: vibeLoading ? '#F59E0B' : '#8B5CF6' }}
                      />
                    )}
                  </span>
                )}
                {rightTab === tab && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: tab === 'vibe' ? '#8B5CF6' : '#3B82F6' }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {rightTab === 'insights' ? (
              <InsightsPanel
                insights={insights}
                nearbyHighlights={nearbyHighlights}
                nearestStation={nearestStation}
                isLoading={isLoading}
              />
            ) : (
              <VibeResultsPanel
                result={vibeResult}
                isLoading={vibeLoading}
                tags={vibeExtractedTags}
                vibe={vibeText}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
