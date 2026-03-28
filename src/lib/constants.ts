export const COLORS = {
  safety: '#10B981',
  transport: '#3B82F6',
  lifestyle: '#F59E0B',
  overall: {
    poor: '#EF4444',
    belowAverage: '#F97316',
    average: '#EAB308',
    good: '#22C55E',
    excellent: '#10B981',
  },
  markers: {
    transport: '#3B82F6',
    amenity: '#F59E0B',
    safety: '#EF4444',
  },
};

export const SCORE_THRESHOLDS = [
  { min: 0, max: 3, label: 'Poor', color: '#EF4444' },
  { min: 3, max: 5, label: 'Below Average', color: '#F97316' },
  { min: 5, max: 7, label: 'Average', color: '#EAB308' },
  { min: 7, max: 8.5, label: 'Good', color: '#22C55E' },
  { min: 8.5, max: 10, label: 'Excellent', color: '#10B981' },
];

export const CATEGORY_CONFIG = {
  transport: {
    label: 'Transport',
    color: COLORS.transport,
    bgClass: 'bg-blue-500/20',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/40',
  },
  amenity: {
    label: 'Amenities',
    color: COLORS.lifestyle,
    bgClass: 'bg-amber-500/20',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/40',
  },
  safety: {
    label: 'Safety',
    color: COLORS.safety,
    bgClass: 'bg-emerald-500/20',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
  },
};

export const RADIUS_METERS = 1000;        // full postcode
export const OUTCODE_RADIUS_METERS = 3000; // outward code (district)

export const OVERPASS_TIMEOUT = 25000;

export const DEFAULT_CENTER: [number, number] = [51.505, -0.09];
export const DEFAULT_ZOOM = 13;
export const SEARCH_ZOOM = 15;
export const OUTCODE_ZOOM = 13;

export const TILE_LAYERS = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
  },
};

export const WALKING_SPEED_MPM = 80; // meters per minute

export const MAX_RECENT_SEARCHES = 5;
export const RECENT_SEARCHES_KEY = 'lait_recent_searches';
