"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ImagePlus, X } from "lucide-react";
import { uploadArticleImageAction } from "@/lib/actions/upload-article-image";
import type { Article } from "@/lib/db/articles";

const RichTextEditor = dynamic(
  () => import("@/components/rich-text-editor").then((m) => ({ default: m.RichTextEditor })),
  { ssr: false }
);

interface ArticleFormProps {
  article?: Article;
  action: (formData: FormData) => Promise<{ error?: string; redirect?: string }>;
}

export function ArticleForm({ article, action }: ArticleFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState(article?.content ?? "");
  const [coverUrl, setCoverUrl] = useState(article?.cover_image_url ?? "");
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload cover image
  const handleCoverFile = async (file: File) => {
    setCoverUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    const result = await uploadArticleImageAction(fd);
    if (result.url) setCoverUrl(result.url);
    else setError(result.error ?? "อัปโหลดรูปปกล้มเหลว");
    setCoverUploading(false);
  };

  // Upload image inside editor → return URL
  const handleEditorImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.set("file", file);
    const result = await uploadArticleImageAction(fd);
    if (result.url) return result.url;
    throw new Error(result.error ?? "อัปโหลดล้มเหลว");
  };

  const submit = async (submitAction: "publish" | "draft") => {
    if (!formRef.current) return;
    setSaving(true);
    setError(null);
    const fd = new FormData(formRef.current);
    fd.set("content", content);
    fd.set("action", submitAction);
    fd.set("cover_image_url", coverUrl);
    const result = await action(fd);
    if (result?.redirect) { window.location.href = result.redirect; return; }
    if (result?.error) { setError(result.error); setSaving(false); }
  };

  return (
    <form ref={formRef} className="space-y-5">
      {article && <input type="hidden" name="id" value={article.id} />}

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      {/* Title */}
      <div className="space-y-1.5">
        <Label>ชื่อบทความ *</Label>
        <Input name="title" defaultValue={article?.title ?? ""} required placeholder="เช่น วิธีเลือกทำเลร้านอาหารให้ปัง" className="text-base" />
      </div>

      {/* Cover image upload */}
      <div className="space-y-1.5">
        <Label>รูปปก</Label>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); e.target.value = ""; }} />

        {coverUrl ? (
          <div className="relative w-full h-48 rounded-xl overflow-hidden border bg-neutral-100 group">
            <Image src={coverUrl} alt="รูปปก" fill className="object-cover" unoptimized />
            <button
              type="button"
              onClick={() => setCoverUrl("")}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="absolute bottom-2 right-2 bg-black/60 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              เปลี่ยนรูป
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={coverUploading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 py-10 text-sm text-neutral-400 hover:border-orange-300 hover:text-orange-500 transition-colors"
          >
            {coverUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            {coverUploading ? "กำลังอัปโหลด..." : "คลิกเพื่อเลือกรูปปก"}
          </button>
        )}
      </div>

      {/* Excerpt */}
      <div className="space-y-1.5">
        <Label>บทนำ / สรุปย่อ</Label>
        <Textarea name="excerpt" defaultValue={article?.excerpt ?? ""} rows={2} placeholder="ใช้แสดงในหน้ารายการบทความ" className="text-sm resize-none" />
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        <Label>เนื้อหาบทความ *</Label>
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="เขียนเนื้อหาที่นี่..."
          onImageUpload={handleEditorImage}
        />
      </div>

      {/* Meta description */}
      <div className="space-y-1.5">
        <Label>Meta Description (SEO)</Label>
        <Textarea name="meta_description" defaultValue={article?.meta_description ?? ""} rows={2} placeholder="คำอธิบายสั้นๆ สำหรับ Google ≈ 120–160 ตัวอักษร" className="text-sm resize-none" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="button" onClick={() => submit("publish")} disabled={saving} className="bg-orange-500 hover:bg-orange-600 gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {article?.status === "published" ? "บันทึกและเผยแพร่" : "เผยแพร่"}
        </Button>
        <Button type="button" variant="outline" onClick={() => submit("draft")} disabled={saving}>
          บันทึกแบบร่าง
        </Button>
        <button type="button" onClick={() => router.back()} className="text-sm text-neutral-500 hover:underline ml-auto">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
