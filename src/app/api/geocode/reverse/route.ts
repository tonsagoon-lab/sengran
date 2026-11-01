import { NextRequest, NextResponse } from "next/server";

type NominatimReverse = {
  address?: {
    country?: string;
    state?: string;
    province?: string;
    county?: string;
    city?: string;
    district?: string;
    city_district?: string;
    suburb?: string;
    neighbourhood?: string;
    municipality?: string;
    town?: string;
    village?: string;
    quarter?: string;
    postcode?: string;
  };
};

type CachedEntry = { expiresAt: number; result: ReverseResult };
type ReverseResult = {
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  postcode: string | null;
};

const CACHE = new Map<string, CachedEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

function cacheKey(lat: number, lng: number): string {
  // Round to 4 decimals (~11 m) so nearby pins share cache entries
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function cacheGet(key: string): ReverseResult | null {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    CACHE.delete(key);
    return null;
  }
  CACHE.delete(key);
  CACHE.set(key, hit);
  return hit.result;
}

function cacheSet(key: string, result: ReverseResult) {
  if (CACHE.size >= MAX_CACHE_ENTRIES) {
    const firstKey = CACHE.keys().next().value;
    if (firstKey) CACHE.delete(firstKey);
  }
  CACHE.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result });
}

export async function GET(req: NextRequest) {
  const latStr = req.nextUrl.searchParams.get("lat");
  const lngStr = req.nextUrl.searchParams.get("lng");
  const lat = latStr ? Number(latStr) : NaN;
  const lng = lngStr ? Number(lngStr) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "invalid coords" }, { status: 400 });
  }

  const key = cacheKey(lat, lng);
  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=th&addressdetails=1&zoom=18`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "sengran.com/1.0 (https://xn--72ch7bybxexd0cc.com)",
        "Accept-Language": "th,en",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json({ province: null, district: null, subdistrict: null, postcode: null });
    const data = (await res.json()) as NominatimReverse;
    const addr = data.address ?? {};
    // Bangkok uses a different Nominatim shape: `city` is the province
    // (กรุงเทพมหานคร), `suburb` is the district (เขต…), `quarter` is the
    // subdistrict (แขวง…). Elsewhere, `city` is actually the district.
    const isBangkok = addr.city === "กรุงเทพมหานคร" || addr.city === "Bangkok";
    const result: ReverseResult = isBangkok
      ? {
          province: addr.city ?? null,
          district: addr.suburb ?? addr.city_district ?? null,
          subdistrict: addr.quarter ?? addr.neighbourhood ?? null,
          postcode: addr.postcode ?? null,
        }
      : {
          province: addr.province ?? addr.state ?? null,
          district: addr.district ?? addr.county ?? addr.city_district ?? addr.city ?? null,
          // Prefer municipality/suburb/village (admin_level 7–8 in TH) over town,
          // which Nominatim often fills with the enclosing city name (same as district).
          subdistrict:
            addr.suburb ??
            addr.neighbourhood ??
            addr.quarter ??
            addr.municipality ??
            addr.village ??
            addr.town ??
            null,
          postcode: addr.postcode ?? null,
        };
    cacheSet(key, result);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ province: null, district: null, subdistrict: null, postcode: null });
  }
}
