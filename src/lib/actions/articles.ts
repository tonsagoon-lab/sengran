"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isPrivileged(email: string | undefined): boolean {
  if (!email) return false;
  const admin = process.env.ADMIN_EMAIL ?? "";
  const staff = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return email === admin || staff.includes(email);
}

async function getPrivilegedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isPrivileged(user.email ?? undefined)) return null;
  return user;
}

function generateSlug(title: string, id: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")  // ASCII only — Thai chars stripped
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .trim();
  const suffix = id.replace(/-/g, "").slice(0, 8);
  return base ? `${base}-${suffix}` : `article-${suffix}`;
}

export async function createArticleAction(formData: FormData): Promise<{ error?: string; redirect?: string }> {
  const user = await getPrivilegedUser();
  if (!user) return { redirect: "/" };

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const excerpt = (formData.get("excerpt") as string) || null;
  const cover_image_url = (formData.get("cover_image_url") as string) || null;
  const meta_description = (formData.get("meta_description") as string) || null;
  const publish = formData.get("action") === "publish";

  const id = crypto.randomUUID();
  const slug = generateSlug(title, id);
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (createAdminClient() as any).from("articles").insert({
    id, title, slug, content, excerpt, cover_image_url, meta_description,
    author_id: user.id,
    status: publish ? "published" : "draft",
    published_at: publish ? now : null,
  });

  if (error) return { error: error.message };
  return { redirect: publish ? `/blog/${slug}` : `/admin?tab=articles` };
}

export async function updateArticleAction(formData: FormData): Promise<{ error?: string; redirect?: string }> {
  const user = await getPrivilegedUser();
  if (!user) return { redirect: "/" };

  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const excerpt = (formData.get("excerpt") as string) || null;
  const cover_image_url = (formData.get("cover_image_url") as string) || null;
  const meta_description = (formData.get("meta_description") as string) || null;
  const publish = formData.get("action") === "publish";
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (createAdminClient() as any)
    .from("articles").select("slug, published_at").eq("id", id).single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (createAdminClient() as any).from("articles").update({
    title, content, excerpt, cover_image_url, meta_description,
    status: publish ? "published" : "draft",
    published_at: publish && !existing?.published_at ? now : existing?.published_at ?? null,
    updated_at: now,
  }).eq("id", id);

  if (error) return { error: error.message };
  return { redirect: publish ? `/blog/${existing?.slug}` : `/admin?tab=articles` };
}

export async function deleteArticleAction(id: string): Promise<{ error?: string; redirect?: string }> {
  const user = await getPrivilegedUser();
  if (!user) return { error: "Unauthorized" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (createAdminClient() as any).from("articles").delete().eq("id", id);
  return { redirect: "/blog" };
}
