import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const STAFF_EMAILS = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(user.email === ADMIN_EMAIL || STAFF_EMAILS.includes(user.email ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get("days") ?? "30"), 1), 365);
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const admin = createAdminClient();
  const { data } = await admin
    .from("page_views")
    .select("created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  const map: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    map[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of data ?? []) {
    const key = (row.created_at as string).slice(0, 10);
    if (key in map) map[key]++;
  }

  return NextResponse.json(Object.entries(map).map(([date, count]) => ({ date, count })));
}
