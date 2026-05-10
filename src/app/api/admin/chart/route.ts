import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

type GroupBy = "day" | "month";

function buildDateMap(from: Date, to: Date, groupBy: GroupBy): Record<string, number> {
  const map: Record<string, number> = {};
  const cursor = new Date(from);
  while (cursor <= to) {
    const key = groupBy === "day"
      ? cursor.toISOString().slice(0, 10)
      : cursor.toISOString().slice(0, 7);
    map[key] = 0;
    if (groupBy === "day") {
      cursor.setDate(cursor.getDate() + 1);
    } else {
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return map;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const period = searchParams.get("period") ?? "30d";

  const now = new Date();
  let from: Date;
  let groupBy: GroupBy = "day";

  switch (period) {
    case "7d":
      from = new Date(now); from.setDate(now.getDate() - 6); groupBy = "day"; break;
    case "3m":
      from = new Date(now); from.setMonth(now.getMonth() - 2); from.setDate(1); groupBy = "month"; break;
    case "12m":
      from = new Date(now); from.setMonth(now.getMonth() - 11); from.setDate(1); groupBy = "month"; break;
    case "ytd":
      from = new Date(now.getFullYear(), 0, 1); groupBy = "month"; break;
    default: // 30d
      from = new Date(now); from.setDate(now.getDate() - 29); groupBy = "day"; break;
  }

  const admin = createAdminClient();

  const [{ data: listingRows }, { data: userRows }] = await Promise.all([
    admin.from("listings").select("created_at").gte("created_at", from.toISOString()),
    admin.from("profiles").select("created_at").gte("created_at", from.toISOString()),
  ]);

  const listingsMap = buildDateMap(from, now, groupBy);
  const usersMap = buildDateMap(from, now, groupBy);

  for (const row of listingRows ?? []) {
    const key = groupBy === "day" ? row.created_at.slice(0, 10) : row.created_at.slice(0, 7);
    if (key in listingsMap) listingsMap[key]++;
  }
  for (const row of userRows ?? []) {
    const key = groupBy === "day"
      ? (row.created_at as string).slice(0, 10)
      : (row.created_at as string).slice(0, 7);
    if (key in usersMap) usersMap[key]++;
  }

  return NextResponse.json({
    groupBy,
    listings: Object.entries(listingsMap).map(([date, count]) => ({ date, count })),
    users: Object.entries(usersMap).map(([date, count]) => ({ date, count })),
  });
}
