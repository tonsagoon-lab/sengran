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

// GET /api/admin/manage/listings?q=xxx
export async function GET(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("listings")
    .select("id, title, slug, status, created_at, profiles!user_id(display_name), categories(name_th)")
    .ilike("title", `%${q}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// PATCH /api/admin/manage/listings  — hide or unhide
export async function PATCH(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { listingId, status } = await req.json();
  if (!listingId || !status) return NextResponse.json({ error: "missing params" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", listingId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/manage/listings?listingId=xxx
export async function DELETE(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listingId = req.nextUrl.searchParams.get("listingId");
  if (!listingId) return NextResponse.json({ error: "listingId required" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("listings").delete().eq("id", listingId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
