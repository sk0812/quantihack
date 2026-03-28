import { NextRequest, NextResponse } from 'next/server';

function looksLikeOutcode(s: string): boolean {
  return /^[A-Z]{1,2}\d[A-Z\d]?$/i.test(s.trim());
}

export async function GET(request: NextRequest) {
  const postcode = request.nextUrl.searchParams.get('postcode');
  if (!postcode) {
    return NextResponse.json({ error: 'Missing postcode' }, { status: 400 });
  }

  const normalised = postcode.trim().toUpperCase();

  // --- Outward code (e.g. "HA6", "SW1A") ---
  if (looksLikeOutcode(normalised)) {
    try {
      const response = await fetch(
        `https://api.postcodes.io/outcodes/${encodeURIComponent(normalised)}`,
        { next: { revalidate: 3600 } }
      );
      const data = await response.json();

      if (!response.ok || data.status !== 200) {
        return NextResponse.json(
          { error: data.error || 'Outcode not found' },
          { status: response.status }
        );
      }

      const r = data.result;
      const districts: string[] = Array.isArray(r.admin_district) ? r.admin_district : [];
      const wards: string[] = Array.isArray(r.admin_ward) ? r.admin_ward : [];
      const countries: string[] = Array.isArray(r.country) ? r.country : [];

      return NextResponse.json({
        postcode: r.outcode,
        latitude: r.latitude,
        longitude: r.longitude,
        ward: wards[0] ?? '',
        district: districts[0] ?? '',
        region: districts[0] ?? '',
        country: countries[0] ?? '',
        adminDistrict: districts.join(', '),
        adminWard: wards[0] ?? '',
        isOutcode: true,
      });
    } catch {
      return NextResponse.json({ error: 'Failed to fetch outcode data' }, { status: 500 });
    }
  }

  // --- Full postcode (e.g. "SW1A 1AA") ---
  try {
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(normalised)}`,
      { next: { revalidate: 3600 } }
    );
    const data = await response.json();

    if (!response.ok || data.status !== 200) {
      return NextResponse.json(
        { error: data.error || 'Postcode not found' },
        { status: response.status }
      );
    }

    const r = data.result;
    return NextResponse.json({
      postcode: r.postcode,
      latitude: r.latitude,
      longitude: r.longitude,
      ward: r.admin_ward ?? '',
      district: r.admin_district ?? '',
      region: r.region ?? '',
      country: r.country ?? '',
      adminDistrict: r.admin_district ?? '',
      adminWard: r.admin_ward ?? '',
      isOutcode: false,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch postcode data' }, { status: 500 });
  }
}
