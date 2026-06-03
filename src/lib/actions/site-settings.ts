"use server";

import { revalidatePath } from "next/cache";
import { setSiteSetting } from "@/lib/db/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const STAFF_EMAILS = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || (user.email !== ADMIN_EMAIL && !STAFF_EMAILS.includes(user.email ?? ""))) {
    throw new Error("Unauthorized");
  }
}

export async function updateSiteSettingAction(key: string, value: string) {
  await requireAdmin();
  await setSiteSetting(key, value);
  revalidatePath("/", "layout");
}
