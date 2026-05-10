import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPublishedArticles } from "@/lib/db/articles";
import { ArticleCard } from "@/components/blog/article-card";
import { TopMenuBar } from "@/components/top-menu-bar";
import { PenLine } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "บทความ — เซ้งร้าน.com",
  description: "บทความและคู่มือสำหรับการซื้อขาย เซ้ง และให้เช่าร้านค้า",
};

function isPrivileged(email: string | undefined): boolean {
  if (!email) return false;
  const admin = process.env.ADMIN_EMAIL ?? "";
  const staff = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return email === admin || staff.includes(email);
}

export default async function BlogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const canWrite = isPrivileged(user?.email ?? undefined);

  const articles = await getPublishedArticles(24);

  return (
    <>
      <TopMenuBar />
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">บทความ</h1>
            <p className="text-sm text-neutral-500 mt-1">คู่มือและเคล็ดลับสำหรับการซื้อขายร้านค้า</p>
          </div>
          {canWrite && (
            <Link
              href="/blog/new"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              <PenLine className="h-4 w-4" /> เขียนบทความ
            </Link>
          )}
        </div>

        {articles.length === 0 ? (
          <div className="rounded-xl border bg-neutral-50 py-20 text-center space-y-2">
            <p className="text-neutral-500">ยังไม่มีบทความ</p>
            {canWrite && (
              <Link href="/blog/new" className="text-sm text-orange-600 hover:underline">
                เขียนบทความแรก →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
