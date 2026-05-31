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

  const { searchParams } = req.nextUrl;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  let since: Date;
  let until: Date;

  if (fromParam && toParam) {
    since = new Date(fromParam);
    since.setHours(0, 0, 0, 0);
    until = new Date(toParam);
    until.setHours(23, 59, 59, 999);
    if (isNaN(since.getTime()) || isNaN(until.getTime()) || since > until) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }
  } else {
    const days = Math.min(Math.max(Number(searchParams.get("days") ?? "30"), 1), 365);
    since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);
    until = new Date();
    until.setHours(23, 59, 59, 999);
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("page_views")
    .select("created_at")
    .gte("created_at", since.toISOString())
    .lte("created_at", until.toISOString())
    .order("created_at", { ascending: true });

  const map: Record<string, number> = {};
  const cursor = new Date(since);
  while (cursor <= until) {
    map[cursor.toISOString().slice(0, 10)] = 0;
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const row of data ?? []) {
    const key = (row.created_at as string).slice(0, 10);
    if (key in map) map[key]++;
  }

  return NextResponse.json(Object.entries(map).map(([date, count]) => ({ date, count })));
}
