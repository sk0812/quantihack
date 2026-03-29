'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AmenityPoint, CrimePoint, FilterState } from '@/lib/types';
import type { RawVibeFeature } from '@/lib/vibeScoring';
import type { GentrificationPoint } from '@/lib/gentrification';
import type { BiophiliaPoint } from '@/lib/biophilia';
import { TILE_LAYERS, DEFAULT_CENTER, DEFAULT_ZOOM, SEARCH_ZOOM, OUTCODE_ZOOM } from '@/lib/constants';
import { getScoreColor } from '@/lib/utils';
import FilterBar from './FilterBar';
import RadiusOverlay from './RadiusOverlay';
import MarkerLayer from './MarkerLayer';

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

interface MapFlyProps {
  center: [number, number] | null;
  isOutcode: boolean;
}

function MapFly({ center, isOutcode }: MapFlyProps) {
  const map = useMap();
  const prevCenter = useRef<string>('');

  useEffect(() => {
    if (!center) return;
    const key = center.join(',');
    if (key === prevCenter.current) return;
    prevCenter.current = key;
    map.flyTo(center, isOutcode ? OUTCODE_ZOOM : SEARCH_ZOOM, { duration: 1.5, easeLinearity: 0.4 });
  }, [center, map, isOutcode]);

  return null;
}

interface MapViewProps {
  center: [number, number] | null;
  amenities: AmenityPoint[];
  crimes: CrimePoint[];
  filters: FilterState;
  filterCounts: { transport: number; amenity: number; safety: number; gentrification: number; biophilia: number };
  onFilterToggle: (key: keyof FilterState) => void;
  overallScore: number | null;
  radius: number;
  isOutcode: boolean;
  vibeMatchTags?: Set<string>;
  vibeAmenities?: RawVibeFeature[];
  gentrificationPoints?: GentrificationPoint[];
  biophiliaPoints?: BiophiliaPoint[];
}

export default function MapView({
  center,
  amenities,
  crimes,
  filters,
  filterCounts,
  onFilterToggle,
  overallScore,
  radius,
  isOutcode,
  vibeMatchTags,
  vibeAmenities,
  gentrificationPoints,
  biophiliaPoints,
}: MapViewProps) {
  const scoreColor = overallScore !== null ? getScoreColor(overallScore) : '#3B82F6';
  const tileLayer = TILE_LAYERS.light; // always light mode

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: '100%', height: '100%' }}
        zoomControl
      >
        <TileLayer
          url={tileLayer.url}
          attribution={tileLayer.attribution}
          subdomains="abcd"
          maxZoom={20}
        />
        <MapFly center={center} isOutcode={isOutcode} />
        {center && (
          <>
            <RadiusOverlay center={center} color={scoreColor} radius={radius} />
            <MarkerLayer
              amenities={amenities}
              crimes={crimes}
              filters={filters}
              center={center}
              vibeMatchTags={vibeMatchTags}
              vibeAmenities={vibeAmenities}
              gentrificationPoints={gentrificationPoints}
              biophiliaPoints={biophiliaPoints}
            />
          </>
        )}
      </MapContainer>

      {/* Filter bar */}
      {center && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-3 py-2 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          }}
        >
          <FilterBar filters={filters} counts={filterCounts} onToggle={onFilterToggle} />
        </div>
      )}

      {/* Empty state */}
      {!center && (
        <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
          <div
            className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.1)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                  fill="#3B82F6"
                  opacity="0.8"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                Enter a postcode to explore
              </p>
              <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                Try a full postcode (SW1A 1AA) or district code (HA6)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
