import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Simple in-memory rate limiter — resets per cold start (serverless)
// Keyed by IP, value is [count, window_start_ms]
const attempts = new Map<string, [number, number]>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_ATTEMPTS = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry[1] > WINDOW_MS) {
    attempts.set(ip, [1, now]);
    return false;
  }
  entry[0]++;
  if (entry[0] > MAX_ATTEMPTS) return true;
  return false;
}

const AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/forgot-password"];

export async function middleware(request: NextRequest) {
  // Rate limit auth pages
  if (AUTH_PATHS.some((p) => request.nextUrl.pathname.startsWith(p)) && request.method === "POST") {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "ลองใหม่อีกครั้งในภายหลัง (ทำรายการบ่อยเกินไป)" },
        { status: 429 }
      );
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
