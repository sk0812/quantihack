import { AmenityPoint, CrimePoint, AmenityType, CrimeType } from './types';
import { hashString, seededRandom } from './utils';
import { RADIUS_METERS } from './constants';

function randomInRadius(
  lat: number,
  lon: number,
  radiusMeters: number,
  rand: () => number
): [number, number] {
  const radiusDeg = radiusMeters / 111320;
  const angle = rand() * 2 * Math.PI;
  const r = Math.sqrt(rand()) * radiusDeg;
  return [lat + r * Math.cos(angle), lon + r * Math.sin(angle)];
}

const CAFE_NAMES = [
  'The Corner Café', 'Brew & Co', 'Morning Light', 'Café Nero', 'Pret A Manger',
  'Costa Coffee', 'Wild Bean Café', 'The Daily Grind', 'Kettle & Rye', 'Flat White',
];
const RESTAURANT_NAMES = [
  'Honest Burgers', 'Wagamama', 'Franco Manca', 'Leon', 'Nandos',
  'Pizza Express', 'Itsu', 'Côte Brasserie', 'The Ivy', 'Carluccios',
];
const PUB_NAMES = [
  'The Red Lion', 'The Crown', 'The White Hart', 'The Fox & Hound', 'The Royal Oak',
  'The King\'s Head', 'The Swan', 'The Black Bull', 'The George', 'The Plough',
];
const SUPERMARKET_NAMES = [
  'Tesco Express', 'Sainsbury\'s Local', 'Waitrose', 'Co-op Food', 'M&S Simply Food',
  'Lidl', 'Aldi', 'Iceland', 'Asda Express', 'Morrisons Daily',
];
const GYM_NAMES = [
  'PureGym', 'The Gym Group', 'David Lloyd', 'Virgin Active', 'Anytime Fitness',
  'F45 Training', 'Barry\'s Bootcamp', 'Third Space', 'Fitness First', 'Nuffield Health',
];
const PARK_NAMES = [
  'Victoria Park', 'Highbury Fields', 'Clissold Park', 'London Fields', 'Springfield Park',
  'Brockwell Park', 'Clapham Common', 'Tooting Common', 'Regent\'s Park', 'Hyde Park',
];
const STATION_NAMES = [
  'Central Station', 'Junction Station', 'High Street Station', 'Park Station', 'Bridge Station',
];
const SUBWAY_NAMES = [
  'Angel', 'Old Street', 'Bethnal Green', 'Dalston Junction', 'Hackney Central',
  'Stoke Newington', 'Seven Sisters', 'Finsbury Park', 'Highbury & Islington', 'Caledonian Road',
];

const CRIME_TYPES: CrimeType[] = ['antisocial', 'burglary', 'vehicle', 'other'];

const AMENITY_TYPE_CONFIG: Array<{
  type: AmenityType;
  category: 'transport' | 'amenity';
  names: string[];
  minCount: number;
  maxCount: number;
}> = [
  { type: 'cafe', category: 'amenity', names: CAFE_NAMES, minCount: 1, maxCount: 8 },
  { type: 'restaurant', category: 'amenity', names: RESTAURANT_NAMES, minCount: 1, maxCount: 8 },
  { type: 'pub', category: 'amenity', names: PUB_NAMES, minCount: 0, maxCount: 5 },
  { type: 'supermarket', category: 'amenity', names: SUPERMARKET_NAMES, minCount: 0, maxCount: 4 },
  { type: 'convenience', category: 'amenity', names: SUPERMARKET_NAMES, minCount: 0, maxCount: 3 },
  { type: 'gym', category: 'amenity', names: GYM_NAMES, minCount: 0, maxCount: 3 },
  { type: 'park', category: 'amenity', names: PARK_NAMES, minCount: 0, maxCount: 4 },
  { type: 'station', category: 'transport', names: STATION_NAMES, minCount: 0, maxCount: 3 },
  { type: 'subway', category: 'transport', names: SUBWAY_NAMES, minCount: 0, maxCount: 4 },
  { type: 'bus_stop', category: 'transport', names: ['Bus Stop'], minCount: 2, maxCount: 10 },
];

export function generateMockAmenities(
  postcode: string,
  lat: number,
  lon: number
): AmenityPoint[] {
  const seed = hashString(postcode);
  const rand = seededRandom(seed);
  const amenities: AmenityPoint[] = [];
  let idCounter = 1;

  for (const config of AMENITY_TYPE_CONFIG) {
    const count =
      config.minCount +
      Math.floor(rand() * (config.maxCount - config.minCount + 1));
    for (let i = 0; i < count; i++) {
      const [pLat, pLon] = randomInRadius(lat, lon, RADIUS_METERS * 0.9, rand);
      const nameIdx = Math.floor(rand() * config.names.length);
      amenities.push({
        id: idCounter++,
        lat: pLat,
        lon: pLon,
        name:
          config.type === 'bus_stop'
            ? `Bus Stop ${String.fromCharCode(65 + i)}`
            : config.names[nameIdx],
        type: config.type,
        category: config.category,
      });
    }
  }

  return amenities;
}

export function generateMockCrimes(
  postcode: string,
  lat: number,
  lon: number
): CrimePoint[] {
  const seed = hashString(postcode + '_crimes');
  const rand = seededRandom(seed);
  const count = 10 + Math.floor(rand() * 21); // 10-30
  const crimes: CrimePoint[] = [];

  for (let i = 0; i < count; i++) {
    const [pLat, pLon] = randomInRadius(lat, lon, RADIUS_METERS * 0.85, rand);
    const typeIdx = Math.floor(rand() * CRIME_TYPES.length);
    crimes.push({
      id: i + 1,
      lat: pLat,
      lon: pLon,
      type: CRIME_TYPES[typeIdx],
      category: 'safety',
    });
  }

  return crimes;
}
