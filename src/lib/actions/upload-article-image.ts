"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isPrivileged(email: string | undefined): boolean {
  if (!email) return false;
  const admin = process.env.ADMIN_EMAIL ?? "";
  const staff = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return email === admin || staff.includes(email);
}

export async function uploadArticleImageAction(formData: FormData): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isPrivileged(user.email ?? undefined)) return { error: "Unauthorized" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "ไม่พบไฟล์" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `${user.id}/${filename}`;

  const adminClient = createAdminClient();
  const { error } = await adminClient.storage
    .from("articles")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { error: error.message };

  const { data } = adminClient.storage.from("articles").getPublicUrl(path);
  return { url: data.publicUrl };
}
