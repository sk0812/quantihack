export interface PostcodeData {
  postcode: string;
  latitude: number;
  longitude: number;
  ward: string;
  district: string;
  region: string;
  country: string;
  adminDistrict: string;
  adminWard: string;
  isOutcode?: boolean;
}

export interface OSMNode {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

export interface AmenityPoint {
  id: number;
  lat: number;
  lon: number;
  name: string;
  type: AmenityType;
  category: MarkerCategory;
  distance?: number;
}

export type AmenityType =
  | 'cafe'
  | 'restaurant'
  | 'pub'
  | 'supermarket'
  | 'convenience'
  | 'gym'
  | 'park'
  | 'station'
  | 'subway'
  | 'bus_stop'
  | 'school'
  | 'college'
  | 'university';

export type MarkerCategory = 'transport' | 'amenity' | 'safety';

export interface CrimePoint {
  id: number;
  lat: number;
  lon: number;
  type: CrimeType;
  category: 'safety';
}

export type CrimeType = 'antisocial' | 'burglary' | 'vehicle' | 'other';

export interface AreaData {
  postcode: PostcodeData;
  amenities: AmenityPoint[];
  crimes: CrimePoint[];
  isMockData: boolean;
}

export interface Scores {
  safety: number;
  transport: number;
  lifestyle: number;
  overall: number;
}

export interface ScoreLabel {
  label: string;
  descriptor: string;
}

export interface Insight {
  icon: string;
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface FilterState {
  transport: boolean;
  amenity: boolean;
  safety: boolean;
}

export interface MarkerCounts {
  transport: number;
  amenity: number;
  safety: number;
}

export interface NearbyHighlight {
  name: string;
  type: string;
  distance: number;
}

export interface OverpassResponse {
  elements: OSMNode[];
}
