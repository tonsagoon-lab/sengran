import { createAdminClient } from "@/lib/supabase/admin";

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  author_id: string | null;
  status: "draft" | "published";
  published_at: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string | null } | null;
}

export async function getPublishedArticles(limit = 20, offset = 0) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (createAdminClient() as any)
    .from("articles")
    .select("id, title, slug, excerpt, cover_image_url, published_at, author_id")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return (data ?? []) as Article[];
}

export async function getArticleBySlug(slug: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (createAdminClient() as any)
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return null;
  return data as Article;
}

export async function getAllArticlesAdmin() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (createAdminClient() as any)
    .from("articles")
    .select("id, title, slug, status, published_at, created_at")
    .order("created_at", { ascending: false });
  return (data ?? []) as Article[];
}

export async function getArticleForEdit(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (createAdminClient() as any)
    .from("articles")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Article;
}
