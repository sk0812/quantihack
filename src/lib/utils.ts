import { SCORE_THRESHOLDS } from './constants';

// Accepts both full postcodes (SW1A 1AA) and outward codes (HA6, EC1A)
export function validatePostcode(postcode: string): boolean {
  const s = postcode.trim();
  return (
    /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(s) ||
    /^[A-Z]{1,2}\d[A-Z\d]?$/i.test(s)
  );
}

export function isOutcode(postcode: string): boolean {
  const s = postcode.trim();
  return /^[A-Z]{1,2}\d[A-Z\d]?$/i.test(s) && !/\s*\d[A-Z]{2}$/.test(s);
}

export function normalisePostcode(postcode: string): string {
  return postcode.trim().toUpperCase();
}

export function getScoreColor(score: number): string {
  const threshold = SCORE_THRESHOLDS.find(
    (t) => score >= t.min && score <= t.max
  );
  return threshold?.color ?? '#EAB308';
}

export function getScoreLabel(score: number): string {
  const threshold = SCORE_THRESHOLDS.find(
    (t) => score >= t.min && score <= t.max
  );
  return threshold?.label ?? 'Average';
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in metres
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)}m`;
  return `${(metres / 1000).toFixed(1)}km`;
}

export function walkingTime(metres: number): number {
  return Math.round(metres / 80);
}

// Simple deterministic hash for a string (seeding mock data)
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

// Seeded pseudo-random number generator (Mulberry32)
export function seededRandom(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
