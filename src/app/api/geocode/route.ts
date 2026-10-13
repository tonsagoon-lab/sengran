import { NextRequest, NextResponse } from "next/server";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type CachedEntry = { expiresAt: number; results: NominatimResult[] };

// Simple in-memory LRU-ish cache (per-instance). Nominatim allows 1 req/sec/IP,
// so caching is essential to survive concurrent typing from multiple users.
const CACHE = new Map<string, CachedEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_ENTRIES = 500;

function cacheGet(key: string): NominatimResult[] | null {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    CACHE.delete(key);
    return null;
  }
  // Refresh LRU position
  CACHE.delete(key);
  CACHE.set(key, hit);
  return hit.results;
}

function cacheSet(key: string, results: NominatimResult[]) {
  if (CACHE.size >= MAX_CACHE_ENTRIES) {
    const firstKey = CACHE.keys().next().value;
    if (firstKey) CACHE.delete(firstKey);
  }
  CACHE.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, results });
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  const key = q.toLowerCase();
  const cached = cacheGet(key);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&accept-language=th,en&countrycodes=th`;

  try {
    const res = await fetch(url, {
      headers: {
        // Required by Nominatim usage policy
        "User-Agent": "sengran.com/1.0 (https://xn--72ch7bybxexd0cc.com)",
        "Accept-Language": "th,en",
      },
      // Short timeout — client is waiting
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return NextResponse.json([], { status: 200 });
    }
    const data = (await res.json()) as NominatimResult[];
    cacheSet(key, data);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
