'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { AmenityPoint, CrimePoint, FilterState } from '@/lib/types';
import { formatDistance } from '@/lib/utils';
import { COLORS } from '@/lib/constants';
import type { RawVibeFeature } from '@/lib/vibeScoring';
import { OSM_TAG_MAP } from '@/lib/osmTagMap';

interface MarkerLayerProps {
  amenities: AmenityPoint[];
  crimes: CrimePoint[];
  filters: FilterState;
  center: [number, number];
  vibeMatchTags?: Set<string>;
  vibeAmenities?: RawVibeFeature[];
}

const TYPE_LABELS: Record<string, string> = {
  cafe: 'Café', restaurant: 'Restaurant', pub: 'Pub',
  supermarket: 'Supermarket', convenience: 'Convenience Store',
  gym: 'Gym', park: 'Park', station: 'Station', subway: 'Tube Station',
  bus_stop: 'Bus Stop', school: 'School', college: 'College', university: 'University',
  bar: 'Bar', fast_food: 'Fast Food', library: 'Library', cinema: 'Cinema',
  theatre: 'Theatre', bakery: 'Bakery', books: 'Bookshop', fitness_centre: 'Gym',
};

const CRIME_LABELS: Record<string, string> = {
  antisocial: 'Anti-Social Behaviour',
  burglary: 'Burglary',
  vehicle: 'Vehicle Crime',
  other: 'Other Crime',
};

function getAmenityColor(type: string): string {
  if (type === 'station' || type === 'subway' || type === 'bus_stop') return COLORS.transport;
  if (type === 'school' || type === 'college' || type === 'university') return '#8B5CF6';
  return COLORS.lifestyle;
}

// Check if this amenity's type maps to a vibe-matched OSM value
function isVibeMatch(type: string, vibeMatchTags?: Set<string>): boolean {
  if (!vibeMatchTags || vibeMatchTags.size === 0) return false;
  // type might be 'cafe', 'park', 'gym' (= fitness_centre in OSM), etc.
  return vibeMatchTags.has(type) || vibeMatchTags.has(
    type === 'gym' ? 'fitness_centre' : type
  );
}

export default function MarkerLayer({
  amenities,
  crimes,
  filters,
  center,
  vibeMatchTags,
  vibeAmenities,
}: MarkerLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  const isVibeMode = vibeAmenities && vibeAmenities.length > 0;

  useEffect(() => {
    if (!map) return;

    if (layerRef.current) {
      layerRef.current.clearLayers();
    } else {
      layerRef.current = L.layerGroup().addTo(map);
    }

    const layer = layerRef.current;

    // ── Vibe mode: only show matched amenities with permanent name labels ──
    if (isVibeMode && vibeAmenities) {
      vibeAmenities.forEach((feat, idx) => {
        const typeLabel = OSM_TAG_MAP[feat.vibeTag]?.label ?? feat.osmValue;
        const displayName = feat.name || typeLabel;
        const dist = formatDistance(feat.distance ?? 0);

        const marker = L.circleMarker([feat.lat, feat.lon], {
          radius: 9,
          fillColor: '#8B5CF6',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 1.0,
        });

        marker.bindTooltip(displayName, {
          permanent: true,
          direction: 'top',
          className: 'vibe-label',
          offset: L.point(0, -10),
        });

        marker.bindPopup(
          `<div style="min-width:160px">
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">${displayName}</div>
            <div style="color:#9ba3c0;font-size:11px">${typeLabel}</div>
            ${feat.distance ? `<div style="color:#8B5CF6;font-size:11px;margin-top:4px;font-family:monospace">${dist} away</div>` : ''}
            <div style="display:inline-flex;align-items:center;gap:4px;background:rgba(139,92,246,0.12);color:#8B5CF6;font-size:10px;padding:2px 7px;border-radius:999px;margin-top:6px;border:1px solid rgba(139,92,246,0.25)">✦ Vibe match</div>
          </div>`,
          { closeButton: false }
        );

        setTimeout(() => {
          if (layerRef.current) marker.addTo(layer);
        }, idx * 20);
      });
      return () => {
        if (layerRef.current) layerRef.current.clearLayers();
      };
    }

    // ── Normal mode: full amenity + crime markers ──
    if (filters.amenity || filters.transport) {
      amenities.forEach((point, idx) => {
        const isTransport = point.category === 'transport';
        if (isTransport && !filters.transport) return;
        if (!isTransport && !filters.amenity) return;

        const vibe = isVibeMatch(point.type, vibeMatchTags);
        const color = vibe ? '#8B5CF6' : getAmenityColor(point.type);
        const dist = formatDistance(point.distance ?? 0);

        const circleMarker = L.circleMarker([point.lat, point.lon], {
          radius: vibe ? 9 : 6,
          fillColor: color,
          color: '#ffffff',
          weight: vibe ? 2.5 : 1.5,
          fillOpacity: vibe ? 1.0 : 0.9,
        });

        const label = TYPE_LABELS[point.type] ?? point.type;
        const vibeBadge = vibe
          ? `<div style="display:inline-flex;align-items:center;gap:4px;background:rgba(139,92,246,0.15);color:#8B5CF6;font-size:10px;padding:1px 6px;border-radius:999px;margin-top:4px;border:1px solid rgba(139,92,246,0.3)">✦ Vibe match</div>`
          : '';

        circleMarker.bindPopup(
          `<div style="min-width:150px">
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">${point.name || label}</div>
            <div style="color:#9ba3c0;font-size:11px">${label}</div>
            ${point.distance ? `<div style="color:#3B82F6;font-size:11px;margin-top:4px;font-family:monospace">${dist} away</div>` : ''}
            ${vibeBadge}
          </div>`,
          { closeButton: false }
        );

        setTimeout(() => {
          if (layerRef.current) circleMarker.addTo(layer);
        }, idx * 20);
      });
    }

    if (filters.safety) {
      crimes.forEach((point, idx) => {
        const crimeMarker = L.circleMarker([point.lat, point.lon], {
          radius: 8,
          fillColor: '#EF4444',
          color: '#EF4444',
          weight: 0,
          fillOpacity: 0.25,
        });

        const label = CRIME_LABELS[point.type] ?? 'Incident';
        crimeMarker.bindPopup(
          `<div>
            <div style="font-weight:600;font-size:13px;margin-bottom:2px;color:#EF4444">${label}</div>
            <div style="color:#9ba3c0;font-size:11px">Reported incident</div>
          </div>`,
          { closeButton: false }
        );

        setTimeout(() => {
          if (layerRef.current) crimeMarker.addTo(layer);
        }, amenities.length * 20 + idx * 15);
      });
    }

    return () => {
      if (layerRef.current) layerRef.current.clearLayers();
    };
  }, [map, amenities, crimes, filters, center, vibeMatchTags, vibeAmenities, isVibeMode]);

  return null;
}
