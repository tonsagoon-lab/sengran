import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArticleForm } from "@/components/blog/article-form";
import { createArticleAction } from "@/lib/actions/articles";
import { TopMenuBar } from "@/components/top-menu-bar";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "เขียนบทความใหม่ — เซ้งร้าน.com" };

function isPrivileged(email: string | undefined): boolean {
  if (!email) return false;
  const admin = process.env.ADMIN_EMAIL ?? "";
  const staff = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return email === admin || staff.includes(email);
}

export default async function NewArticlePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isPrivileged(user.email ?? undefined)) redirect("/");

  return (
    <>
      <TopMenuBar />
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <h1 className="text-xl font-bold text-neutral-900">เขียนบทความใหม่</h1>
        <ArticleForm action={createArticleAction} />
      </div>
    </>
  );
}
