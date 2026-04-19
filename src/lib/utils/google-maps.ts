export interface Coords {
  lat: number;
  lng: number;
}

function parseFromResolvedUrl(url: string): Coords | null {
  // @lat,lng,zoom
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  // !3d<lat>!4d<lng>
  const d3Match = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (d3Match) {
    return { lat: parseFloat(d3Match[1]), lng: parseFloat(d3Match[2]) };
  }

  // ?q=lat,lng or q=name@lat,lng
  try {
    const u = new URL(url);
    const q = u.searchParams.get("q");
    if (q) {
      const qMatch = q.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }
    // ?ll=lat,lng
    const ll = u.searchParams.get("ll");
    if (ll) {
      const llMatch = ll.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
    }
  } catch {
    // not a valid URL, skip
  }

  return null;
}

const SHORT_URL_RE = /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//;

export async function extractCoordsFromGoogleMapsUrl(url: string): Promise<Coords | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (SHORT_URL_RE.test(trimmed)) {
    // Follow redirect server-side (CORS blocks client)
    try {
      const res = await fetch(trimmed, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const resolved = res.url;
      return parseFromResolvedUrl(resolved);
    } catch {
      return null;
    }
  }

  return parseFromResolvedUrl(trimmed);
}
