"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X, Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

const EMPTY_FORM = { title: "", image_url: "", link_url: "", starts_at: "", ends_at: "" };

function useImageUpload(onUploaded: (url: string) => void, fixedPath?: string) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = fixedPath ?? `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("banners").upload(path, file, { upsert: !!fixedPath });
      if (error) throw error;
      const { data } = supabase.storage.from("banners").getPublicUrl(path);
      onUploaded(data.publicUrl);
    } catch (e) {
      alert("อัพโหลดไม่สำเร็จ: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return { uploading, inputRef, handleFile };
}

function ImageUploadField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { uploading, inputRef, handleFile } = useImageUpload(onChange);

  return (
    <div className="space-y-1">
      <Label className="text-xs">รูปภาพ *</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL รูปภาพ หรืออัพโหลด →"
          className="h-8 text-sm flex-1"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-2 h-8 rounded border border-neutral-200 bg-white text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 shrink-0"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          อัพโหลด
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
      {value && (
        <div className="relative h-16 w-32 rounded overflow-hidden bg-neutral-100 mt-1">
          <Image src={value} alt="preview" fill className="object-cover" unoptimized />
        </div>
      )}
    </div>
  );
}

export function BannersManager() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/banners");
    setBanners(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (b: Banner) => {
    await fetch("/api/admin/banners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, is_active: !b.is_active }),
    });
    setBanners((prev) => prev.map((x) => x.id === b.id ? { ...x, is_active: !x.is_active } : x));
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...banners];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const updated = next.map((b, i) => ({ ...b, display_order: i }));
    setBanners(updated);
    await Promise.all(
      updated.map((b) =>
        fetch("/api/admin/banners", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: b.id, display_order: b.display_order }),
        })
      )
    );
  };

  const add = async () => {
    if (!form.image_url.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        display_order: banners.length,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      }),
    });
    if (res.ok) { setForm(EMPTY_FORM); await load(); }
    setSaving(false);
  };

  const startEdit = (b: Banner) => {
    setEditId(b.id);
    setEditForm({
      title: b.title ?? "",
      image_url: b.image_url,
      link_url: b.link_url ?? "",
      starts_at: b.starts_at ? b.starts_at.slice(0, 10) : "",
      ends_at: b.ends_at ? b.ends_at.slice(0, 10) : "",
    });
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    await fetch("/api/admin/banners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editId,
        title: editForm.title || null,
        image_url: editForm.image_url,
        link_url: editForm.link_url || null,
        starts_at: editForm.starts_at || null,
        ends_at: editForm.ends_at || null,
      }),
    });
    setEditId(null);
    await load();
    setSaving(false);
  };

  const deleteBanner = async (id: string) => {
    await fetch("/api/admin/banners", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setConfirmDelete(null);
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="rounded-lg border bg-neutral-50 p-4 space-y-3">
        <p className="text-sm font-medium text-neutral-700">เพิ่มแบนเนอร์ใหม่</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">ชื่อ (optional)</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="แบนเนอร์โปรโมชัน" className="h-8 text-sm" />
          </div>
          <ImageUploadField value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
          <div className="space-y-1">
            <Label className="text-xs">ลิงก์ปลายทาง</Label>
            <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">วันเริ่ม</Label>
              <Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">วันหมด</Label>
              <Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="h-8 text-sm" />
            </div>
          </div>
        </div>
        <Button onClick={add} disabled={saving || !form.image_url.trim()} size="sm" className="bg-orange-500 hover:bg-orange-600 gap-1">
          <Plus className="h-3.5 w-3.5" /> เพิ่มแบนเนอร์
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-neutral-400">กำลังโหลด...</p>
      ) : (
        <div className="space-y-2">
          {banners.map((b, i) => (
            <div key={b.id} className="rounded-lg border bg-white p-3">
              {editId === b.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">ชื่อ</Label>
                      <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="ชื่อ" className="h-8 text-sm" />
                    </div>
                    <ImageUploadField value={editForm.image_url} onChange={(v) => setEditForm({ ...editForm, image_url: v })} />
                    <div className="space-y-1">
                      <Label className="text-xs">ลิงก์ปลายทาง</Label>
                      <Input value={editForm.link_url} onChange={(e) => setEditForm({ ...editForm, link_url: e.target.value })} placeholder="https://..." className="h-8 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" value={editForm.starts_at} onChange={(e) => setEditForm({ ...editForm, starts_at: e.target.value })} className="h-8 text-sm" />
                      <Input type="date" value={editForm.ends_at} onChange={(e) => setEditForm({ ...editForm, ends_at: e.target.value })} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveEdit} disabled={saving} size="sm" className="bg-green-600 hover:bg-green-700 gap-1"><Check className="h-3.5 w-3.5" /> บันทึก</Button>
                    <Button onClick={() => setEditId(null)} size="sm" variant="outline"><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20"><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => move(i, 1)} disabled={i === banners.length - 1} className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20"><ChevronDown className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="relative h-12 w-20 shrink-0 rounded overflow-hidden bg-neutral-100">
                    <Image src={b.image_url} alt={b.title ?? "banner"} fill className="object-cover" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{b.title || "(ไม่มีชื่อ)"}</p>
                    <p className="text-xs text-neutral-400 truncate">{b.link_url || "ไม่มีลิงก์"}</p>
                    {(b.starts_at || b.ends_at) && (
                      <p className="text-xs text-neutral-400">
                        {b.starts_at ? new Date(b.starts_at).toLocaleDateString("th-TH") : "∞"} – {b.ends_at ? new Date(b.ends_at).toLocaleDateString("th-TH") : "∞"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggle(b)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium border ${b.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-neutral-100 text-neutral-500 border-neutral-200"}`}
                    >
                      {b.is_active ? "แสดง" : "ซ่อน"}
                    </button>
                    <button onClick={() => startEdit(b)} className="text-neutral-400 hover:text-orange-500"><Pencil className="h-3.5 w-3.5" /></button>
                    {confirmDelete === b.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteBanner(b.id)} className="text-xs text-red-600 font-medium hover:underline">ยืนยัน</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs text-neutral-400">ยกเลิก</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(b.id)} className="text-neutral-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {banners.length === 0 && <p className="text-sm text-neutral-400 text-center py-4">ยังไม่มีแบนเนอร์</p>}
        </div>
      )}
    </div>
  );
}

const MODAL_IMAGES = [
  { label: "รูป Option 1 — ซื้อ package เซ้งร้าน", path: "modal-package.jpg" },
  { label: "รูป Option 2 — ฝากเซ้งร้าน", path: "modal-faak.jpg" },
];

function ModalImageSlot({ label, path }: { label: string; path: string }) {
  const [url, setUrl] = useState(`https://fexxmtjmrlpitzsjrgbd.supabase.co/storage/v1/object/public/banners/${path}?t=${Date.now()}`);
  const { uploading, inputRef, handleFile } = useImageUpload((newUrl) => setUrl(newUrl + `?t=${Date.now()}`), path);

  return (
    <div className="rounded-lg border bg-white p-4 space-y-2">
      <p className="text-sm font-medium text-neutral-700">{label}</p>
      <div className="flex items-center gap-3">
        <div className="relative h-20 w-36 rounded overflow-hidden bg-neutral-100 shrink-0">
          <Image src={url} alt={label} fill className="object-cover" unoptimized />
        </div>
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-neutral-200 bg-white text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "กำลังอัพโหลด..." : "เปลี่ยนรูป"}
          </button>
          <p className="text-xs text-neutral-400 mt-1">ไฟล์จะถูกบันทึกทับรูปเดิมอัตโนมัติ</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

interface ModalTexts {
  modal_title: string;
  modal_subtitle: string;
  button_text_package: string;
  button_text_faak: string;
  button_text_view: string;
  line_package_url: string;
  line_faak_url: string;
}

const MODAL_TEXT_DEFAULTS: ModalTexts = {
  modal_title: "ประกาศเผยแพร่แล้ว!",
  modal_subtitle: "เลือกขั้นตอนถัดไป",
  button_text_package: "ซื้อ package เซ้งร้าน",
  button_text_faak: "ฝากเซ้งร้าน",
  button_text_view: "ดูประกาศที่ลง",
  line_package_url: "",
  line_faak_url: "",
};

function ModalTextsForm() {
  const [data, setData] = useState<ModalTexts>(MODAL_TEXT_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/announcement")
      .then((r) => r.json())
      .then((full) => {
        setData({
          modal_title: full.modal_title ?? MODAL_TEXT_DEFAULTS.modal_title,
          modal_subtitle: full.modal_subtitle ?? MODAL_TEXT_DEFAULTS.modal_subtitle,
          button_text_package: full.button_text_package ?? MODAL_TEXT_DEFAULTS.button_text_package,
          button_text_faak: full.button_text_faak ?? MODAL_TEXT_DEFAULTS.button_text_faak,
          button_text_view: full.button_text_view ?? MODAL_TEXT_DEFAULTS.button_text_view,
          line_package_url: full.line_package_url ?? "",
          line_faak_url: full.line_faak_url ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/admin/announcement", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <p className="text-sm text-neutral-400">กำลังโหลด...</p>;

  const inputCls = "w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300";

  return (
    <div className="space-y-3 border-t pt-4">
      <p className="text-sm font-semibold text-neutral-700">ข้อความ + ลิ้งใน popup</p>

      <div className="space-y-1.5">
        <Label className="text-xs">หัวข้อ modal</Label>
        <input type="text" value={data.modal_title} onChange={(e) => setData({ ...data, modal_title: e.target.value })} className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">คำบรรยายใต้หัวข้อ</Label>
        <input type="text" value={data.modal_subtitle} onChange={(e) => setData({ ...data, modal_subtitle: e.target.value })} className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">ข้อความปุ่ม Option 1 (ซื้อ package)</Label>
        <input type="text" value={data.button_text_package} onChange={(e) => setData({ ...data, button_text_package: e.target.value })} className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">LINE ลิงก์ปุ่ม Option 1</Label>
        <input type="url" value={data.line_package_url} onChange={(e) => setData({ ...data, line_package_url: e.target.value })} placeholder="https://line.me/R/ti/p/~..." className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">ข้อความปุ่ม Option 2 (ฝากเซ้งร้าน)</Label>
        <input type="text" value={data.button_text_faak} onChange={(e) => setData({ ...data, button_text_faak: e.target.value })} className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">LINE ลิงก์ปุ่ม Option 2</Label>
        <input type="url" value={data.line_faak_url} onChange={(e) => setData({ ...data, line_faak_url: e.target.value })} placeholder="https://line.me/R/ti/p/~..." className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">ข้อความปุ่ม Option 3 (ดูประกาศ)</Label>
        <input type="text" value={data.button_text_view} onChange={(e) => setData({ ...data, button_text_view: e.target.value })} className={inputCls} />
      </div>

      <Button onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600 gap-1.5">
        {saved ? <><Check className="h-4 w-4" /> บันทึกแล้ว</> : "บันทึกข้อความ"}
      </Button>
    </div>
  );
}

export function ModalImagesManager() {
  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-neutral-500">รูปและข้อความเหล่านี้จะแสดงใน popup หลังจากลงประกาศสำเร็จ</p>
      <div className="space-y-3">
        {MODAL_IMAGES.map((item) => (
          <ModalImageSlot key={item.path} label={item.label} path={item.path} />
        ))}
      </div>
      <ModalTextsForm />
    </div>
  );
}
