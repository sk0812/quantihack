import { AmenityPoint, CrimePoint, Scores } from './types';
import { clamp } from './utils';

export interface AmenityCounts {
  cafeCount: number;
  restaurantCount: number;
  pubCount: number;
  supermarketCount: number;
  convenienceCount: number;
  gymCount: number;
  parkCount: number;
  stationCount: number;
  subwayCount: number;
  busStopCount: number;
  schoolCount: number;
  crimeCount: number;
}

export function countAmenities(
  amenities: AmenityPoint[],
  crimes: CrimePoint[]
): AmenityCounts {
  return {
    cafeCount: amenities.filter((a) => a.type === 'cafe').length,
    restaurantCount: amenities.filter((a) => a.type === 'restaurant').length,
    pubCount: amenities.filter((a) => a.type === 'pub').length,
    supermarketCount: amenities.filter((a) => a.type === 'supermarket').length,
    convenienceCount: amenities.filter((a) => a.type === 'convenience').length,
    gymCount: amenities.filter((a) => a.type === 'gym').length,
    parkCount: amenities.filter((a) => a.type === 'park').length,
    stationCount: amenities.filter(
      (a) => a.type === 'station' || a.type === 'subway'
    ).length,
    subwayCount: amenities.filter((a) => a.type === 'subway').length,
    busStopCount: amenities.filter((a) => a.type === 'bus_stop').length,
    schoolCount: amenities.filter(
      (a) => a.type === 'school' || a.type === 'college' || a.type === 'university'
    ).length,
    crimeCount: crimes.length,
  };
}

export function computeScores(counts: AmenityCounts, radiusMeters = 1000): Scores {
  const safety = clamp(10 - counts.crimeCount / 3, 0, 10);

  // Density factor: normalise to a 1km-radius baseline so outcode (3km)
  // scores reflect amenities-per-km² rather than raw totals.
  // factor = (1000 / radius)²  →  1.0 at 1km, ~0.11 at 3km
  const d = Math.pow(1000 / radiusMeters, 2);

  const transport = clamp(
    d * (counts.stationCount * 2.5 + counts.busStopCount * 0.5),
    0,
    10
  );

  const lifestyle = clamp(
    d * (
      counts.cafeCount * 1.0 +
      counts.gymCount * 1.5 +
      counts.supermarketCount * 1.2 +
      counts.parkCount * 1.5 +
      counts.pubCount * 0.8 +
      counts.restaurantCount * 0.8
    ),
    0,
    10
  );

  const overall =
    safety * 0.35 + transport * 0.3 + lifestyle * 0.35;

  return {
    safety: Math.round(safety * 10) / 10,
    transport: Math.round(transport * 10) / 10,
    lifestyle: Math.round(lifestyle * 10) / 10,
    overall: Math.round(overall * 10) / 10,
  };
}
