import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const BOTS = /bot|crawler|spider|crawling|facebookexternalhit|Twitterbot|Google|Bing|Baidu|DuckDuck/i;

export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  if (BOTS.test(ua)) return NextResponse.json({ ok: true });

  try {
    const { path, referrer } = await req.json();
    if (!path || typeof path !== "string") return NextResponse.json({ ok: true });

    const referrer_domain = extractDomain(referrer ?? null);

    const supabase = createAdminClient();
    await supabase.from("page_views").insert({ path, referrer: referrer || null, referrer_domain });
  } catch {
    // Never fail silently — tracking is non-critical
  }

  return NextResponse.json({ ok: true });
}
