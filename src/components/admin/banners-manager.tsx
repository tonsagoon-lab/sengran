"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X } from "lucide-react";

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">ชื่อ (optional)</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="แบนเนอร์โปรโมชัน" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">URL รูปภาพ *</Label>
            <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="h-8 text-sm" />
          </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="ชื่อ" className="h-8 text-sm" />
                    <Input value={editForm.image_url} onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })} placeholder="URL รูป" className="h-8 text-sm" />
                    <Input value={editForm.link_url} onChange={(e) => setEditForm({ ...editForm, link_url: e.target.value })} placeholder="ลิงก์ปลายทาง" className="h-8 text-sm" />
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
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20"><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => move(i, 1)} disabled={i === banners.length - 1} className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20"><ChevronDown className="h-3.5 w-3.5" /></button>
                  </div>

                  {/* Thumb */}
                  <div className="relative h-12 w-20 shrink-0 rounded overflow-hidden bg-neutral-100">
                    <Image src={b.image_url} alt={b.title ?? "banner"} fill className="object-cover" unoptimized />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{b.title || "(ไม่มีชื่อ)"}</p>
                    <p className="text-xs text-neutral-400 truncate">{b.link_url || "ไม่มีลิงก์"}</p>
                    {(b.starts_at || b.ends_at) && (
                      <p className="text-xs text-neutral-400">
                        {b.starts_at ? new Date(b.starts_at).toLocaleDateString("th-TH") : "∞"} – {b.ends_at ? new Date(b.ends_at).toLocaleDateString("th-TH") : "∞"}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
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
