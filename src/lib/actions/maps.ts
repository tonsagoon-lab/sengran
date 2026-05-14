"use server";

import type { Coords } from "@/lib/utils/google-maps";

const DESKTOP_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const SHORT_URL_RE = /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//;

function parseFromUrl(url: string): Coords | null {
  const d3 = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (d3) return { lat: parseFloat(d3[1]), lng: parseFloat(d3[2]) };

  const at = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };

  try {
    const u = new URL(url);
    const q = u.searchParams.get("q");
    if (q) {
      const qm = q.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (qm) return { lat: parseFloat(qm[1]), lng: parseFloat(qm[2]) };
    }
    const ll = u.searchParams.get("ll");
    if (ll) {
      const lm = ll.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (lm) return { lat: parseFloat(lm[1]), lng: parseFloat(lm[2]) };
    }
  } catch { /* ignore */ }

  return null;
}

function parseFromHtml(html: string): Coords | null {
  const d3 = html.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (d3) return { lat: parseFloat(d3[1]), lng: parseFloat(d3[2]) };

  const at = html.match(/\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };

  // URL-encoded: %212d<lng>%213d<lat> — place share URLs
  const enc = html.match(/%212d(-?\d+\.\d+)[^%]*%213d(-?\d+\.\d+)/);
  if (enc) return { lat: parseFloat(enc[2]), lng: parseFloat(enc[1]) };

  const quoted = html.match(/"(-?\d+\.\d{4,}),(-?\d+\.\d{4,})"/);
  if (quoted) return { lat: parseFloat(quoted[1]), lng: parseFloat(quoted[2]) };

  return null;
}

export async function resolveGoogleMapsUrl(url: string): Promise<Coords | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (!SHORT_URL_RE.test(trimmed)) {
    return parseFromUrl(trimmed);
  }

  try {
    const res = await fetch(trimmed, {
      redirect: "follow",
      headers: {
        "User-Agent": DESKTOP_UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
      },
    });

    const fromUrl = parseFromUrl(res.url);
    if (fromUrl) return fromUrl;

    const html = await res.text();
    const fromHtml = parseFromHtml(html);
    if (fromHtml) return fromHtml;

    // Retry fetching the final URL directly (handles Vercel redirect quirks)
    if (res.url.includes("google.com/maps")) {
      const res2 = await fetch(res.url, {
        headers: {
          "User-Agent": DESKTOP_UA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
        },
      });
      const html2 = await res2.text();
      return parseFromHtml(html2);
    }

    return null;
  } catch {
    return null;
  }
}
