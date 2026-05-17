"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function FaviconManager() {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/site-settings?key=favicon_url")
      .then((r) => r.json())
      .then((d) => setCurrentUrl(d.value));
  }, []);

  async function handleFile(file: File) {
    setError(null);
    setSuccess(false);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `settings/favicon.${ext}`;
      const { error: upErr } = await supabase.storage.from("banners").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("banners").getPublicUrl(path);
      const url = data.publicUrl + "?t=" + Date.now();

      setSaving(true);
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "favicon_url", value: data.publicUrl }),
      });
      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
      setCurrentUrl(url);
      setSuccess(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-sm">
      <p className="text-sm text-neutral-600">
        อัพโหลดรูป favicon สำหรับแท็บเบราว์เซอร์ (แนะนำ .ico หรือ .png ขนาด 32×32 หรือ 64×64 px)
      </p>

      {currentUrl && (
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <Image src={currentUrl} alt="favicon" width={32} height={32} unoptimized className="rounded" />
          <span className="text-xs text-neutral-500 break-all">{currentUrl.split("?")[0].split("/").pop()}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".ico,.png,.svg,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />

      <Button
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || saving}
        className="gap-2"
      >
        {(uploading || saving) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? "กำลังอัพโหลด..." : saving ? "กำลังบันทึก..." : "เลือกไฟล์ favicon"}
      </Button>

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          บันทึกสำเร็จ — favicon จะแสดงในแท็บเบราว์เซอร์
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
