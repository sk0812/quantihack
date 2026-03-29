import { NextRequest, NextResponse } from 'next/server';

interface PropertyMarker {
  id: string;
  lat: number;
  lon: number;
  price: number;
  priceLabel: string;
  address: string;
  postcode: string;
  propertyType: string;
  bedrooms: number;
  dateSold: string;
  zooplaUrl: string;
}

const SPARQL_ENDPOINT = 'https://landregistry.data.gov.uk/sparql.json';

const PROP_TYPE_MAP: Record<string, string> = {
  detached: 'Detached',
  semiDetached: 'Semi-Detached',
  terraced: 'Terraced',
  flat: 'Flat',
  otherPropertyType: 'Other',
};

// in-memory cache keyed by outcode
const cache = new Map<string, { data: PropertyMarker[]; ts: number }>();
const TTL = 3600_000; // 1 hour

function formatAddress(paon: string, saon: string | undefined, street: string, town: string | undefined): string {
  const parts: string[] = [];
  if (saon) parts.push(saon);
  parts.push(paon);
  parts.push(street);
  if (town) parts.push(town);
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(', ');
}

function zooplaUrl(postcode: string): string {
  const code = postcode.toLowerCase().replace(/\s+/g, '-');
  return `https://www.zoopla.co.uk/for-sale/property/${code}/?results_sort=newest_listings`;
}

export async function GET(req: NextRequest) {
  const outcode = req.nextUrl.searchParams.get('outcode')?.toUpperCase().trim();
  if (!outcode) return NextResponse.json({ error: 'outcode required' }, { status: 400 });

  const cached = cache.get(outcode);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json({ properties: cached.data });
  }

  // ── 1. Query Land Registry SPARQL ──────────────────────────────────────────
  const query = `
PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>

SELECT ?price ?date ?paon ?saon ?street ?town ?postcode ?propType
WHERE {
  ?transaction lrppi:pricePaid ?price ;
               lrppi:transactionDate ?date ;
               lrppi:propertyType ?propType ;
               lrppi:propertyAddress ?address .
  ?address lrcommon:postcode ?postcode ;
           lrcommon:paon ?paon ;
           lrcommon:street ?street .
  OPTIONAL { ?address lrcommon:saon ?saon }
  OPTIONAL { ?address lrcommon:town ?town }
  FILTER(STRSTARTS(STR(?postcode), "${outcode} "))
}
ORDER BY DESC(?date)
LIMIT 30
`.trim();

  let bindings: Record<string, { value: string }>[] = [];
  try {
    const sparqlRes = await fetch(SPARQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `query=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(12_000),
    });
    if (sparqlRes.ok) {
      const json = await sparqlRes.json();
      bindings = json?.results?.bindings ?? [];
    }
  } catch {
    return NextResponse.json({ properties: [] });
  }

  if (bindings.length === 0) {
    return NextResponse.json({ properties: [] });
  }

  // ── 2. Batch geocode unique postcodes ──────────────────────────────────────
  const uniquePostcodes = [...new Set(bindings.map((b) => b.postcode?.value).filter(Boolean))];
  const postcodeLatLon = new Map<string, { lat: number; lon: number }>();

  try {
    const geoRes = await fetch('https://api.postcodes.io/postcodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postcodes: uniquePostcodes }),
      signal: AbortSignal.timeout(8_000),
    });
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      for (const item of geoData?.result ?? []) {
        if (item?.result?.latitude && item?.result?.longitude) {
          postcodeLatLon.set(item.query, {
            lat: item.result.latitude,
            lon: item.result.longitude,
          });
        }
      }
    }
  } catch {
    // geocoding failed — skip those properties
  }

  // ── 3. Build PropertyMarker list ───────────────────────────────────────────
  const properties: PropertyMarker[] = [];
  const seen = new Set<string>();

  for (const b of bindings) {
    const postcode = b.postcode?.value;
    if (!postcode) continue;

    const coords = postcodeLatLon.get(postcode);
    if (!coords) continue;

    const price = parseInt(b.price?.value ?? '0', 10);
    if (!price) continue;

    const paon = b.paon?.value ?? '';
    const saon = b.saon?.value;
    const street = b.street?.value ?? '';
    const town = b.town?.value;
    const address = formatAddress(paon, saon, street, town);

    // Extract type from URI e.g. ".../common/detached" → "detached"
    const typeUri = b.propType?.value ?? '';
    const typeKey = typeUri.split('/').pop() ?? '';
    const propertyType = PROP_TYPE_MAP[typeKey] ?? 'Property';

    const dateSold = b.date?.value?.split('T')[0] ?? '';

    // dedupe by address+price (same postcode jitter slightly per property)
    const dedupKey = `${address}::${price}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    // Jitter lat/lon slightly per unique address to avoid stacking
    const jitter = () => (Math.random() - 0.5) * 0.0003;

    properties.push({
      id: dedupKey,
      lat: coords.lat + jitter(),
      lon: coords.lon + jitter(),
      price,
      priceLabel: `£${price.toLocaleString('en-GB')}`,
      address: address || postcode,
      postcode,
      propertyType,
      bedrooms: 0,
      dateSold,
      zooplaUrl: zooplaUrl(postcode),
    });
  }

  cache.set(outcode, { data: properties, ts: Date.now() });
  return NextResponse.json({ properties });
}
