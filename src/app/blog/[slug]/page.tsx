import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getArticleBySlug } from "@/lib/db/articles";
import { RichTextDisplay } from "@/components/rich-text-display";
import { TopMenuBar } from "@/components/top-menu-bar";
import { Pencil, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

function isPrivileged(email: string | undefined): boolean {
  if (!email) return false;
  const admin = process.env.ADMIN_EMAIL ?? "";
  const staff = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return email === admin || staff.includes(email);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "ไม่พบบทความ" };
  return {
    title: `${article.title} — เซ้งร้าน.com`,
    description: article.meta_description ?? article.excerpt ?? undefined,
    openGraph: {
      title: article.title,
      description: article.meta_description ?? article.excerpt ?? undefined,
      images: article.cover_image_url ? [article.cover_image_url] : [],
      type: "article",
      publishedTime: article.published_at ?? undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article, { data: { user } }] = await Promise.all([
    getArticleBySlug(slug),
    createClient().then((s) => s.auth.getUser()),
  ]);
  if (!article) notFound();

  const canWrite = isPrivileged(user?.email ?? undefined);
  const author = (article.profiles as { display_name: string | null } | null)?.display_name;
  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <>
      <TopMenuBar />
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Back */}
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-orange-600">
          <ArrowLeft className="h-4 w-4" /> กลับรายการบทความ
        </Link>

        {/* Cover */}
        {article.cover_image_url && (
          <div className="relative h-64 w-full rounded-xl overflow-hidden bg-neutral-100">
            <Image src={article.cover_image_url} alt={article.title} fill className="object-cover" priority />
          </div>
        )}

        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-neutral-900 leading-snug">{article.title}</h1>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              {author && <span>{author}</span>}
              {author && date && <span>·</span>}
              {date && <span>{date}</span>}
            </div>
            {canWrite && (
              <Link
                href={`/blog/${article.slug}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
              >
                <Pencil className="h-3.5 w-3.5" /> แก้ไขบทความ
              </Link>
            )}
          </div>
        </div>

        <hr />

        {/* Content */}
        <RichTextDisplay html={article.content} className="prose prose-neutral max-w-none" />
      </div>
    </>
  );
}
