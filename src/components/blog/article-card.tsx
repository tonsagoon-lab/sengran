import Link from "next/link";
import Image from "next/image";
import type { Article } from "@/lib/db/articles";

export function ArticleCard({ article }: { article: Article }) {
  const author = (article.profiles as { display_name: string | null } | null)?.display_name;
  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <Link href={`/blog/${article.slug}`} className="group block rounded-xl border bg-white overflow-hidden hover:shadow-md transition-shadow">
      {article.cover_image_url ? (
        <div className="relative h-44 w-full bg-neutral-100">
          <Image src={article.cover_image_url} alt={article.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-[1.02] transition-transform" />
        </div>
      ) : (
        <div className="h-44 w-full bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center text-4xl">📝</div>
      )}
      <div className="p-4 space-y-2">
        <h2 className="font-semibold text-neutral-900 line-clamp-2 group-hover:text-orange-600 transition-colors">
          {article.title}
        </h2>
        {article.excerpt && (
          <p className="text-sm text-neutral-500 line-clamp-2">{article.excerpt}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-neutral-400 pt-1">
          {author && <span>{author}</span>}
          {author && date && <span>·</span>}
          {date && <span>{date}</span>}
        </div>
      </div>
    </Link>
  );
}
