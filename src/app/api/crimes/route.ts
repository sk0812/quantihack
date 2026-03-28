import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { CrimePoint, CrimeType } from '@/lib/types';

// Parse CSV once at module load
interface RawCrime {
  lat: number;
  lon: number;
  type: CrimeType;
}

function parseCrimeType(raw: string): CrimeType {
  const s = raw.trim().toLowerCase();
  if (s === 'anti-social behaviour') return 'antisocial';
  if (s === 'burglary') return 'burglary';
  if (s === 'vehicle crime') return 'vehicle';
  return 'other';
}

function loadCrimes(): RawCrime[] {
  const filePath = path.join(process.cwd(), 'crime.csv');
  const text = fs.readFileSync(filePath, 'utf-8');
  const lines = text.split('\n');
  const results: RawCrime[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    // Columns: 0=CrimeID, 1=Month, 2=ReportedBy, 3=FallsWithin,
    //          4=Longitude, 5=Latitude, 6=Location, 7=LSOAcode,
    //          8=LSOAname, 9=CrimeType, 10=LastOutcome, 11=Context
    const lon = parseFloat(cols[4]);
    const lat = parseFloat(cols[5]);
    const crimeTypeRaw = cols[9] ?? '';

    if (isNaN(lat) || isNaN(lon)) continue;

    results.push({ lat, lon, type: parseCrimeType(crimeTypeRaw) });
  }

  return results;
}

// Cached at module level — parsed once per server instance
let cachedCrimes: RawCrime[] | null = null;

function getCrimes(): RawCrime[] {
  if (!cachedCrimes) cachedCrimes = loadCrimes();
  return cachedCrimes;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');
  const radius = parseFloat(searchParams.get('radius') ?? '1000');

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
  }

  const all = getCrimes();
  const nearby: CrimePoint[] = [];

  for (let i = 0; i < all.length; i++) {
    const c = all[i];
    if (haversine(lat, lon, c.lat, c.lon) <= radius) {
      nearby.push({ id: i, lat: c.lat, lon: c.lon, type: c.type, category: 'safety' });
    }
  }

  return NextResponse.json({ crimes: nearby });
}
