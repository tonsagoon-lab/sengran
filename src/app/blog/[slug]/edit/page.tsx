import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getArticleForEdit } from "@/lib/db/articles";
import { ArticleForm } from "@/components/blog/article-form";
import { updateArticleAction } from "@/lib/actions/articles";
import { TopMenuBar } from "@/components/top-menu-bar";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "แก้ไขบทความ — เซ้งร้าน.com" };

function isPrivileged(email: string | undefined): boolean {
  if (!email) return false;
  const admin = process.env.ADMIN_EMAIL ?? "";
  const staff = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return email === admin || staff.includes(email);
}

export default async function EditArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isPrivileged(user.email ?? undefined)) redirect("/");

  // Find article by slug to get id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ref } = await (await import("@/lib/supabase/admin")).createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("articles" as any).select("id").eq("slug", slug).single() as any;

  if (!ref?.id) notFound();
  const article = await getArticleForEdit(ref.id);
  if (!article) notFound();

  return (
    <>
      <TopMenuBar />
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <h1 className="text-xl font-bold text-neutral-900">แก้ไขบทความ</h1>
        <ArticleForm article={article} action={updateArticleAction} />
      </div>
    </>
  );
}
