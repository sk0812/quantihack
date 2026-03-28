'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { AmenityPoint, CrimePoint, FilterState } from '@/lib/types';
import { formatDistance } from '@/lib/utils';
import { COLORS } from '@/lib/constants';

interface MarkerLayerProps {
  amenities: AmenityPoint[];
  crimes: CrimePoint[];
  filters: FilterState;
  center: [number, number];
}

const TYPE_LABELS: Record<string, string> = {
  cafe: 'Café', restaurant: 'Restaurant', pub: 'Pub',
  supermarket: 'Supermarket', convenience: 'Convenience Store',
  gym: 'Gym', park: 'Park', station: 'Station', subway: 'Tube Station',
  bus_stop: 'Bus Stop', school: 'School', college: 'College', university: 'University',
};

const CRIME_LABELS: Record<string, string> = {
  antisocial: 'Anti-Social Behaviour',
  burglary: 'Burglary',
  vehicle: 'Vehicle Crime',
  other: 'Other Crime',
};

function getAmenityColor(type: string): string {
  if (type === 'station' || type === 'subway' || type === 'bus_stop') return COLORS.transport;
  if (type === 'school' || type === 'college' || type === 'university') return '#8B5CF6'; // purple
  return COLORS.lifestyle;
}

export default function MarkerLayer({ amenities, crimes, filters, center }: MarkerLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    if (layerRef.current) {
      layerRef.current.clearLayers();
    } else {
      layerRef.current = L.layerGroup().addTo(map);
    }

    const layer = layerRef.current;

    // Amenities
    if (filters.amenity || filters.transport) {
      amenities.forEach((point, idx) => {
        const isTransport = point.category === 'transport';
        if (isTransport && !filters.transport) return;
        if (!isTransport && !filters.amenity) return;

        const color = getAmenityColor(point.type);
        const dist = formatDistance(point.distance ?? 0);

        const circleMarker = L.circleMarker([point.lat, point.lon], {
          radius: 6,
          fillColor: color,
          color: '#ffffff',
          weight: 1.5,
          fillOpacity: 0.9,
        });

        const label = TYPE_LABELS[point.type] ?? point.type;
        circleMarker.bindPopup(
          `<div style="min-width:140px">
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">${point.name || label}</div>
            <div style="color:#9ba3c0;font-size:11px">${label}</div>
            ${point.distance ? `<div style="color:#3B82F6;font-size:11px;margin-top:4px;font-family:monospace">${dist} away</div>` : ''}
          </div>`,
          { closeButton: false }
        );

        // Stagger animation via timeout
        setTimeout(() => {
          if (layerRef.current) {
            circleMarker.addTo(layer);
          }
        }, idx * 20);
      });
    }

    // Crimes
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
          if (layerRef.current) {
            crimeMarker.addTo(layer);
          }
        }, amenities.length * 20 + idx * 15);
      });
    }

    return () => {
      if (layerRef.current) {
        layerRef.current.clearLayers();
      }
    };
  }, [map, amenities, crimes, filters, center]);

  return null;
}
