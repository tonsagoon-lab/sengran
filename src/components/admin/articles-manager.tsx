"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, PenLine } from "lucide-react";

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  profiles: { display_name: string | null } | null;
}

export function ArticlesManager() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/articles");
    setArticles(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const deleteArticle = async (id: string) => {
    await fetch("/api/admin/articles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setConfirmDelete(null);
    setArticles((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/blog/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          <PenLine className="h-3.5 w-3.5" /> เขียนบทความ
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">กำลังโหลด...</p>
      ) : (
        <div className="divide-y rounded-lg border bg-white overflow-hidden">
          {articles.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    a.status === "published"
                      ? "bg-green-50 text-green-700"
                      : "bg-yellow-50 text-yellow-700"
                  }`}>
                    {a.status === "published" ? "เผยแพร่" : "ร่าง"}
                  </span>
                  <span className="text-sm font-medium text-neutral-800 truncate">{a.title}</span>
                </div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  {a.profiles?.display_name && <span>{a.profiles.display_name} · </span>}
                  {a.published_at
                    ? new Date(a.published_at).toLocaleDateString("th-TH")
                    : new Date(a.created_at).toLocaleDateString("th-TH")}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/blog/${a.slug}/edit`} className="text-neutral-400 hover:text-orange-500">
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                {confirmDelete === a.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => deleteArticle(a.id)} className="text-xs text-red-600 font-medium hover:underline">ยืนยัน</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs text-neutral-400">ยกเลิก</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(a.id)} className="text-neutral-300 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {articles.length === 0 && (
            <p className="text-sm text-neutral-400 text-center py-8">ยังไม่มีบทความ</p>
          )}
        </div>
      )}
    </div>
  );
}
