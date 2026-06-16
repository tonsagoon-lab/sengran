import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type"); // 'premium' | 'facebook'
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from("boost_packages")
    .select("id, name_th, price_thb, duration_days, package_type, reach_text")
    .eq("is_active", true)
    .order("display_order");

  if (type) query = query.eq("package_type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data ?? []);
}
