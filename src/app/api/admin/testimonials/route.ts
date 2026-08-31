import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function checkAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (user?.email === (process.env.ADMIN_EMAIL ?? "")) ? user : null;
}

export async function GET() {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  const { data } = await supabase.from("testimonials").select("*").order("display_order");
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  const { data, error } = await supabase.from("testimonials").insert({
    message: body.message,
    display_order: body.display_order ?? 0,
    is_active: true,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...updates } = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  const { error } = await supabase.from("testimonials").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
