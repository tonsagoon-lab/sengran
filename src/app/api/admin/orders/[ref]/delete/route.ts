import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const STAFF_EMAILS = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
const DELETE_PASSWORD = process.env.ORDER_DELETE_PASSWORD ?? "1234";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || (user.email !== ADMIN_EMAIL && !STAFF_EMAILS.includes(user.email ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { password } = await req.json() as { password: string };
  if (password !== DELETE_PASSWORD) {
    return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 403 });
  }

  const { ref } = await params;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("payment_orders")
    .delete()
    .eq("reference", ref);

  if (error) return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  return NextResponse.json({ success: true });
}
