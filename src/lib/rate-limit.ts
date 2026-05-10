import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";

export function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Returns true if the request is within the allowed rate.
 * Uses a sliding-window counter stored in the rate_limits table.
 * Table must exist: see migration below.
 *
 * CREATE TABLE IF NOT EXISTS rate_limits (
 *   key text NOT NULL,
 *   window_start timestamptz NOT NULL DEFAULT now(),
 *   count int NOT NULL DEFAULT 1,
 *   PRIMARY KEY (key, window_start)
 * );
 * CREATE INDEX ON rate_limits (window_start);
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = createAdminClient();
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000);

  // Upsert counter for this key+window
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("increment_rate_limit", {
    p_key: key,
    p_window_start: windowStart.toISOString(),
    p_limit: limit,
  });

  if (error) {
    // On error, allow the request (fail open)
    return { allowed: true, remaining: 1 };
  }

  const count = (data as number) ?? 1;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
  };
}
