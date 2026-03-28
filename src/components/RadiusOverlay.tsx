'use client';

import { Circle } from 'react-leaflet';

interface RadiusOverlayProps {
  center: [number, number];
  color: string;
  radius: number;
}

export default function RadiusOverlay({ center, color, radius }: RadiusOverlayProps) {
  return (
    <Circle
      center={center}
      radius={radius}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.05,
        weight: 2,
        dashArray: '6 4',
        opacity: 0.5,
      }}
    />
  );
}
