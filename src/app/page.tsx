'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Moon, Sun, MapPin } from 'lucide-react';
import PostcodeSearch from '@/components/PostcodeSearch';
import AreaHeader from '@/components/AreaHeader';
import ScorePanel from '@/components/ScorePanel';
import InsightsPanel from '@/components/InsightsPanel';
import { PostcodeData, AmenityPoint, CrimePoint, FilterState } from '@/lib/types';
import { Scores } from '@/lib/types';
import { countAmenities, computeScores } from '@/lib/scoring';
import { generateInsights } from '@/lib/insights';
import { generateMockCrimes } from '@/lib/mockData';
import { haversineDistance } from '@/lib/utils';
import { RADIUS_METERS, OUTCODE_RADIUS_METERS } from '@/lib/constants';

// Dynamic import — Leaflet is browser-only
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#1a1d27' }}>
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#3B82F6', borderTopColor: 'transparent' }}
        />
        <p className="text-sm" style={{ color: '#5a6285' }}>Loading map…</p>
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
      tags.railway === 'station' ||
      tags.railway === 'halt' ||
      tags.station === 'subway' ||
      tags.railway === 'tram_stop'
    ) {
      type = tags.station === 'subway' ? 'subway' : 'station';
      category = 'transport';
    }
    else if (tags.highway === 'bus_stop') { type = 'bus_stop'; category = 'transport'; }

    if (!type) continue;

    // Deduplicate by name+type for ways that share a node
    const key = `${type}::${name || `${lat.toFixed(5)},${lon.toFixed(5)}`}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const distance = haversineDistance(centerLat, centerLon, lat, lon);
    if (distance > radiusMeters) continue;

    results.push({ id: el.id, lat, lon, name, type, category, distance });
  }

  return results;
}

export default function HomePage() {
  const [isDark, setIsDark] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [postcodeData, setPostcodeData] = useState<PostcodeData | null>(null);
  const [amenities, setAmenities] = useState<AmenityPoint[]>([]);
  const [crimes, setCrimes] = useState<CrimePoint[]>([]);
  const [scores, setScores] = useState<Scores | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeRadius, setActiveRadius] = useState(RADIUS_METERS);

  const [filters, setFilters] = useState<FilterState>({
    transport: true,
    amenity: true,
    safety: true,
  });

  const handleFilterToggle = useCallback((key: keyof FilterState) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSearch = useCallback(async (postcode: string) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      // 1. Resolve postcode / outcode → lat+lng
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

      // 2. Fetch real OSM data — only fall back to mock on a genuine error
      let parsedAmenities: AmenityPoint[] = [];

      try {
        const osmRes = await fetch(
          `/api/overpass?lat=${pd.latitude}&lon=${pd.longitude}&radius=${radius}`
        );

        if (osmRes.ok) {
          const osmData = await osmRes.json();
          parsedAmenities = parseOSMAmenities(osmData.elements ?? [], pd.latitude, pd.longitude, radius);
        } else {
          // API error — use mocks so the app isn't empty
          const { generateMockAmenities } = await import('@/lib/mockData');
          parsedAmenities = generateMockAmenities(postcode, pd.latitude, pd.longitude);
        }
      } catch {
        const { generateMockAmenities } = await import('@/lib/mockData');
        parsedAmenities = generateMockAmenities(postcode, pd.latitude, pd.longitude);
      }

      // 3. Generate mock crime data (always)
      const mockCrimes = generateMockCrimes(postcode, pd.latitude, pd.longitude);

      setAmenities(parsedAmenities);
      setCrimes(mockCrimes);

      // 4. Compute scores
      const counts = countAmenities(parsedAmenities, mockCrimes);
      setScores(computeScores(counts));
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const nearbyHighlights = useMemo(() => {
    return amenities
      .filter((a) => a.category === 'amenity')
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, 3)
      .map((a) => ({ name: a.name || a.type, type: a.type, distance: a.distance ?? 0 }));
  }, [amenities]);

  const nearestStation = useMemo(() => {
    const stations = amenities.filter((a) => a.type === 'station' || a.type === 'subway');
    return stations.length
      ? stations.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))[0]
      : null;
  }, [amenities]);

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden ${isDark ? '' : 'light'}`}
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        <aside
          className="w-80 shrink-0 flex flex-col overflow-hidden border-r"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <MapPin size={16} style={{ color: '#3B82F6' }} />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>LAIT</span>
                <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>Local Intelligence</span>
              </div>
            </div>
            <button
              onClick={() => setIsDark((v) => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
              aria-label="Toggle dark mode"
            >
              {isDark
                ? <Sun size={14} style={{ color: 'var(--text-secondary)' }} />
                : <Moon size={14} style={{ color: 'var(--text-secondary)' }} />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <PostcodeSearch onSearch={handleSearch} isLoading={isLoading} />

            {errorMessage && (
              <div
                className="px-3 py-2.5 rounded-xl text-xs"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}
              >
                {errorMessage}
              </div>
            )}

            <AreaHeader postcodeData={postcodeData} />
            <ScorePanel scores={scores} isLoading={isLoading} />
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative overflow-hidden">
          <MapView
            center={mapCenter}
            amenities={amenities}
            crimes={crimes}
            filters={filters}
            filterCounts={filterCounts}
            onFilterToggle={handleFilterToggle}
            overallScore={scores?.overall ?? null}
            isDark={isDark}
            radius={activeRadius}
            isOutcode={postcodeData?.isOutcode ?? false}
          />
        </main>

        {/* Right panel */}
        <aside
          className="w-72 shrink-0 flex flex-col overflow-hidden border-l"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div
            className="flex items-center px-4 py-4 border-b shrink-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Area Insights</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <InsightsPanel
              insights={insights}
              nearbyHighlights={nearbyHighlights}
              nearestStation={nearestStation}
              isLoading={isLoading}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
