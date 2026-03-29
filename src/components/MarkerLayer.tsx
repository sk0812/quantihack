'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { AmenityPoint, CrimePoint, FilterState } from '@/lib/types';
import { formatDistance } from '@/lib/utils';
import { COLORS } from '@/lib/constants';
import type { RawVibeFeature } from '@/lib/vibeScoring';
import { OSM_TAG_MAP } from '@/lib/osmTagMap';
import type { GentrificationPoint } from '@/lib/gentrification';
import type { BiophiliaPoint } from '@/lib/biophilia';

interface MarkerLayerProps {
  amenities: AmenityPoint[];
  crimes: CrimePoint[];
  filters: FilterState;
  center: [number, number];
  vibeMatchTags?: Set<string>;
  vibeAmenities?: RawVibeFeature[];
  gentrificationPoints?: GentrificationPoint[];
  biophiliaPoints?: BiophiliaPoint[];
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
  if (type === 'school' || type === 'college' || type === 'university') return '#8B5CF6';
  return COLORS.lifestyle;
}

export default function MarkerLayer({
  amenities,
  crimes,
  filters,
  vibeMatchTags,
  vibeAmenities,
  gentrificationPoints,
  biophiliaPoints,
}: MarkerLayerProps) {
  const map = useMap();

  // ── One LayerGroup per category, created once ──────────────────────────────
  const amenityGroup     = useRef<L.LayerGroup | null>(null);
  const transportGroup   = useRef<L.LayerGroup | null>(null);
  const safetyGroup      = useRef<L.LayerGroup | null>(null);
  const gentrifyGroup    = useRef<L.LayerGroup | null>(null);
  const vibeGroup        = useRef<L.LayerGroup | null>(null);
  const biophiliaGroup   = useRef<L.LayerGroup | null>(null);

  // Init all groups once when map is ready
  useEffect(() => {
    if (!map) return;
    amenityGroup.current   = L.layerGroup();
    transportGroup.current = L.layerGroup();
    safetyGroup.current    = L.layerGroup();
    gentrifyGroup.current  = L.layerGroup();
    vibeGroup.current      = L.layerGroup();
    biophiliaGroup.current = L.layerGroup();

    return () => {
      [amenityGroup, transportGroup, safetyGroup, gentrifyGroup, vibeGroup, biophiliaGroup].forEach((r) => {
        if (r.current) { r.current.remove(); r.current = null; }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // ── Rebuild amenity + transport layers when amenity data changes ───────────
  useEffect(() => {
    if (!amenityGroup.current || !transportGroup.current) return;
    amenityGroup.current.clearLayers();
    transportGroup.current.clearLayers();

    amenities.forEach((point) => {
      const isTransport = point.category === 'transport';
      const isVibeMatch =
        vibeMatchTags && vibeMatchTags.size > 0 &&
        (vibeMatchTags.has(point.type) || (point.type === 'gym' && vibeMatchTags.has('fitness_centre')));
      const color = isVibeMatch ? '#8B5CF6' : getAmenityColor(point.type);
      const label = TYPE_LABELS[point.type] ?? point.type;
      const dist  = formatDistance(point.distance ?? 0);

      const marker = L.circleMarker([point.lat, point.lon], {
        radius: isVibeMatch ? 9 : 6,
        fillColor: color,
        color: '#ffffff',
        weight: isVibeMatch ? 2.5 : 1.5,
        fillOpacity: isVibeMatch ? 1.0 : 0.9,
      });

      const vibeBadge = isVibeMatch
        ? `<div style="display:inline-flex;align-items:center;gap:4px;background:rgba(139,92,246,0.15);color:#8B5CF6;font-size:10px;padding:1px 6px;border-radius:999px;margin-top:4px;border:1px solid rgba(139,92,246,0.3)">✦ Vibe match</div>`
        : '';

      marker.bindPopup(
        `<div style="min-width:150px">
          <div style="font-weight:600;font-size:13px;margin-bottom:2px">${point.name || label}</div>
          <div style="color:#9ba3c0;font-size:11px">${label}</div>
          ${point.distance ? `<div style="color:#3B82F6;font-size:11px;margin-top:4px;font-family:monospace">${dist} away</div>` : ''}
          ${vibeBadge}
        </div>`,
        { closeButton: false }
      );

      const target = isTransport ? transportGroup.current! : amenityGroup.current!;
      marker.addTo(target);
    });
  }, [amenities, vibeMatchTags]);

  // ── Rebuild safety layer when crime data changes ───────────────────────────
  useEffect(() => {
    if (!safetyGroup.current) return;
    safetyGroup.current.clearLayers();

    crimes.forEach((point) => {
      const label = CRIME_LABELS[point.type] ?? 'Incident';
      const marker = L.circleMarker([point.lat, point.lon], {
        radius: 8,
        fillColor: '#EF4444',
        color: '#EF4444',
        weight: 0,
        fillOpacity: 0.25,
      });
      marker.bindPopup(
        `<div>
          <div style="font-weight:600;font-size:13px;margin-bottom:2px;color:#EF4444">${label}</div>
          <div style="color:#9ba3c0;font-size:11px">Reported incident</div>
        </div>`,
        { closeButton: false }
      );
      marker.addTo(safetyGroup.current!);
    });
  }, [crimes]);

  // ── Rebuild gentrification layer when points change ───────────────────────
  useEffect(() => {
    if (!gentrifyGroup.current) return;
    gentrifyGroup.current.clearLayers();
    if (!gentrificationPoints?.length) return;

    gentrificationPoints.forEach((point) => {
      const isLifestyle = point.subtype === 'lifestyle';
      const color = isLifestyle ? '#EAB308' : '#6B7280';
      const label = isLifestyle ? 'Lifestyle' : 'Legacy';
      const displayName = point.name || point.categoryLabel;

      const marker = L.circleMarker([point.lat, point.lon], {
        radius: 7,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        fillOpacity: 0.85,
      });
      marker.bindPopup(
        `<div style="min-width:150px">
          <div style="font-weight:600;font-size:13px;margin-bottom:2px">${displayName}</div>
          <div style="color:#9ba3c0;font-size:11px">${point.categoryLabel}</div>
          <div style="display:inline-flex;align-items:center;gap:4px;background:${color}20;color:${color};font-size:10px;padding:2px 7px;border-radius:999px;margin-top:6px;border:1px solid ${color}40;font-weight:600">
            ${isLifestyle ? '✦' : '◆'} ${label}
          </div>
        </div>`,
        { closeButton: false }
      );
      marker.addTo(gentrifyGroup.current!);
    });
  }, [gentrificationPoints]);

  // ── Rebuild biophilia layer when points change ────────────────────────────
  useEffect(() => {
    if (!biophiliaGroup.current) return;
    biophiliaGroup.current.clearLayers();
    if (!biophiliaPoints?.length) return;

    biophiliaPoints.forEach((point) => {
      const isNature = point.category === 'nature';
      const color = isNature ? '#10B981' : '#DC2626';
      const displayName = point.name || point.label;

      const marker = L.circleMarker([point.lat, point.lon], {
        radius: isNature ? 7 : 6,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        fillOpacity: isNature ? 0.75 : 0.6,
      });

      marker.bindPopup(
        `<div style="min-width:140px">
          <div style="font-weight:600;font-size:13px;margin-bottom:2px">${displayName}</div>
          <div style="color:#9ba3c0;font-size:11px">${point.label}</div>
          <div style="display:inline-flex;align-items:center;gap:4px;background:${color}20;color:${color};font-size:10px;padding:2px 7px;border-radius:999px;margin-top:6px;border:1px solid ${color}40;font-weight:600">
            ${isNature ? '🌿 Nature' : '🔴 Stressor'} · +${point.weight} pts
          </div>
        </div>`,
        { closeButton: false }
      );
      marker.addTo(biophiliaGroup.current!);
    });
  }, [biophiliaPoints]);

  // ── Rebuild vibe layer when vibe results change ────────────────────────────
  useEffect(() => {
    if (!vibeGroup.current) return;
    vibeGroup.current.clearLayers();
    if (!vibeAmenities?.length) return;

    vibeAmenities.forEach((feat) => {
      const typeLabel  = OSM_TAG_MAP[feat.vibeTag]?.label ?? feat.osmValue;
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
      marker.addTo(vibeGroup.current!);
    });
  }, [vibeAmenities]);

  // ── Toggle layer visibility on filter or vibe-mode change ─────────────────
  // This never rebuilds markers — only adds/removes groups from the map.
  useEffect(() => {
    if (!map) return;

    const isVibeMode = !!(vibeAmenities && vibeAmenities.length > 0);

    function show(g: L.LayerGroup | null) {
      if (g && !map.hasLayer(g)) g.addTo(map);
    }
    function hide(g: L.LayerGroup | null) {
      if (g && map.hasLayer(g)) map.removeLayer(g);
    }
    function toggle(g: L.LayerGroup | null, on: boolean) {
      on ? show(g) : hide(g);
    }

    if (isVibeMode) {
      // Vibe mode: only show vibe layer
      hide(amenityGroup.current);
      hide(transportGroup.current);
      hide(safetyGroup.current);
      hide(gentrifyGroup.current);
      hide(biophiliaGroup.current);
      show(vibeGroup.current);
    } else {
      hide(vibeGroup.current);
      toggle(amenityGroup.current,   filters.amenity);
      toggle(transportGroup.current, filters.transport);
      toggle(safetyGroup.current,    filters.safety);
      toggle(gentrifyGroup.current,  filters.gentrification);
      toggle(biophiliaGroup.current, filters.biophilia);
    }
  }, [map, filters, vibeAmenities]);

  return null;
}
