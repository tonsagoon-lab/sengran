export interface Coords {
  lat: number;
  lng: number;
}

function parseFromResolvedUrl(url: string): Coords | null {
  // !3d<lat>!4d<lng> — actual pin location (highest priority)
  const d3Match = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (d3Match) {
    return { lat: parseFloat(d3Match[1]), lng: parseFloat(d3Match[2]) };
  }

  // @lat,lng,zoom — map viewport center (fallback)
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
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

function parseFromHtml(html: string): Coords | null {
  // !3d<lat>!4d<lng> in unencoded HTML
  const d3 = html.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (d3) return { lat: parseFloat(d3[1]), lng: parseFloat(d3[2]) };

  // @lat,lng in unencoded HTML
  const at = html.match(/\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };

  // URL-encoded: %212d<lng>%213d<lat> — place share URLs embed coords this way
  const enc = html.match(/%212d(-?\d+\.\d+)[^%]*%213d(-?\d+\.\d+)/);
  if (enc) return { lat: parseFloat(enc[2]), lng: parseFloat(enc[1]) };

  // quoted coordinate pair
  const quoted = html.match(/"(-?\d+\.\d{4,}),(-?\d+\.\d{4,})"/);
  if (quoted) return { lat: parseFloat(quoted[1]), lng: parseFloat(quoted[2]) };

  return null;
}

const SHORT_URL_RE = /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//;

const DESKTOP_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function extractCoordsFromGoogleMapsUrl(url: string): Promise<Coords | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (SHORT_URL_RE.test(trimmed)) {
    try {
      const res = await fetch(trimmed, {
        redirect: "follow",
        headers: {
          "User-Agent": DESKTOP_UA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
        },
      });

      // Try resolved URL first
      const fromUrl = parseFromResolvedUrl(res.url);
      if (fromUrl) return fromUrl;

      // Fallback: parse coords from HTML body
      const html = await res.text();
      return parseFromHtml(html);
    } catch {
      return null;
    }
  }

  return parseFromResolvedUrl(trimmed);
}
