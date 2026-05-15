import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isPrivileged(email: string | undefined): boolean {
  if (!email) return false;
  const admin = process.env.ADMIN_EMAIL ?? "";
  const staff = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return email === admin || staff.includes(email);
}

async function checkAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isPrivileged(user?.email ?? undefined) ? user : null;
}

// GET /api/admin/manage/users?q=xxx
export async function GET(req: NextRequest) {
  const caller = await checkAuth();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, email, created_at, listing_quota")
    .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!profiles) return NextResponse.json([]);

  // Get listing counts per user
  const ids = profiles.map((p: { id: string }) => p.id);
  const { data: counts } = await supabase
    .from("listings")
    .select("user_id")
    .in("user_id", ids);

  const countMap: Record<string, number> = {};
  for (const row of counts ?? []) {
    countMap[row.user_id] = (countMap[row.user_id] ?? 0) + 1;
  }

  return NextResponse.json(
    profiles.map((p: { id: string; display_name: string | null; email: string | null; created_at: string; listing_quota: number | null }) => ({
      ...p,
      listingCount: countMap[p.id] ?? 0,
    }))
  );
}

// DELETE /api/admin/manage/users?userId=xxx  — deletes user + all their listings
export async function DELETE(req: NextRequest) {
  const caller = await checkAuth();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Prevent self-deletion
  if (userId === caller.id) {
    return NextResponse.json({ error: "ไม่สามารถลบบัญชีตัวเองได้" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Delete all listings (cascades to images, amenities, editorial_picks rows)
  await supabase.from("listings").delete().eq("user_id", userId);

  // Delete profile
  await supabase.from("profiles").delete().eq("id", userId);

  // Delete auth user
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/manage/users  — update per-user listing quota
export async function PATCH(req: NextRequest) {
  const caller = await checkAuth();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, listing_quota } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ listing_quota: listing_quota === null ? null : Number(listing_quota) })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
