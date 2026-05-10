import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getEditorialPicks,
  addEditorialPick,
  removeEditorialPick,
  reorderEditorialPicks,
  searchListingsForPicks,
} from "@/lib/db/editorial-picks";

function isPrivileged(email: string | undefined): boolean {
  if (!email) return false;
  const admin = process.env.ADMIN_EMAIL ?? "";
  const staff = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return email === admin || staff.includes(email);
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET /api/admin/picks?q=xxx  — search listings or list current picks
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!isPrivileged(user?.email ?? undefined)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q");
  if (q !== null) {
    const results = await searchListingsForPicks(q);
    return NextResponse.json(results);
  }

  const picks = await getEditorialPicks();
  return NextResponse.json(picks);
}

// POST /api/admin/picks  — add listing to picks
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!isPrivileged(user?.email ?? undefined)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { listingId } = await req.json();
  if (!listingId) return NextResponse.json({ error: "listingId required" }, { status: 400 });

  try {
    await addEditorialPick(listingId, user!.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

// DELETE /api/admin/picks?listingId=xxx  — remove from picks
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!isPrivileged(user?.email ?? undefined)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const listingId = req.nextUrl.searchParams.get("listingId");
  if (!listingId) return NextResponse.json({ error: "listingId required" }, { status: 400 });

  await removeEditorialPick(listingId);
  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/picks  — reorder
export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!isPrivileged(user?.email ?? undefined)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { ids } = await req.json();
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids required" }, { status: 400 });

  await reorderEditorialPicks(ids);
  return NextResponse.json({ ok: true });
}
