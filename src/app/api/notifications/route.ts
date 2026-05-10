import { NextResponse } from "next/server";
import { getUserNotifications, getUnreadCount } from "@/lib/db/alerts";
import { markNotificationsReadAction } from "@/lib/actions/alerts";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 30), 100);
  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(limit),
    getUnreadCount(),
  ]);
  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: Request) {
  const { ids } = await req.json();
  if (Array.isArray(ids) && ids.length > 0) {
    await markNotificationsReadAction(ids);
  }
  return NextResponse.json({ ok: true });
}
