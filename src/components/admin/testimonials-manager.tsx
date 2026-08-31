"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X } from "lucide-react";

interface Testimonial {
  id: string;
  message: string;
  display_order: number;
  is_active: boolean;
}

export function TestimonialsManager() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/testimonials");
    setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (t: Testimonial) => {
    await fetch("/api/admin/testimonials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, is_active: !t.is_active }),
    });
    setItems((prev) => prev.map((x) => x.id === t.id ? { ...x, is_active: !x.is_active } : x));
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const updated = next.map((t, i) => ({ ...t, display_order: i }));
    setItems(updated);
    await Promise.all(
      updated.map((t) =>
        fetch("/api/admin/testimonials", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: t.id, display_order: t.display_order }),
        })
      )
    );
  };

  const add = async () => {
    if (!newMsg.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/testimonials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newMsg.trim(), display_order: items.length }),
    });
    if (res.ok) { setNewMsg(""); await load(); }
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editId || !editMsg.trim()) return;
    setSaving(true);
    await fetch("/api/admin/testimonials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, message: editMsg.trim() }),
    });
    setEditId(null);
    await load();
    setSaving(false);
  };

  const remove = async (id: string) => {
    await fetch("/api/admin/testimonials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setConfirmDelete(null);
    setItems((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-xs text-neutral-500">แสดงเป็น chip สั้น ๆ ในหน้าแรก — เขียนเป็นวลีสั้น ไม่ต้องยาว</p>

      {/* Add form */}
      <div className="rounded-lg border bg-neutral-50 p-3 space-y-2">
        <Label className="text-xs">เพิ่มวลีใหม่</Label>
        <div className="flex gap-2">
          <Input
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            placeholder="เช่น ปิดดีลได้เร็ว, มีคนติดต่อเยอะ"
            className="h-9 text-sm"
          />
          <Button onClick={add} disabled={saving || !newMsg.trim()} size="sm" className="bg-orange-500 hover:bg-orange-600 gap-1 shrink-0">
            <Plus className="h-3.5 w-3.5" /> เพิ่ม
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-neutral-400">กำลังโหลด...</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((t, i) => (
            <div key={t.id} className="rounded-lg border bg-white p-2.5 flex items-center gap-2">
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20"><ChevronUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20"><ChevronDown className="h-3.5 w-3.5" /></button>
              </div>
              {editId === t.id ? (
                <>
                  <Input
                    value={editMsg}
                    onChange={(e) => setEditMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); }}
                    className="h-8 text-sm flex-1"
                    autoFocus
                  />
                  <Button onClick={saveEdit} disabled={saving} size="sm" className="bg-green-600 hover:bg-green-700 h-8 gap-1"><Check className="h-3.5 w-3.5" /></Button>
                  <Button onClick={() => setEditId(null)} size="sm" variant="outline" className="h-8"><X className="h-3.5 w-3.5" /></Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-neutral-700 flex-1 min-w-0 truncate">&ldquo;{t.message}&rdquo;</p>
                  <button
                    onClick={() => toggle(t)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${t.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-neutral-100 text-neutral-500 border-neutral-200"}`}
                  >
                    {t.is_active ? "แสดง" : "ซ่อน"}
                  </button>
                  <button onClick={() => { setEditId(t.id); setEditMsg(t.message); }} className="text-neutral-400 hover:text-orange-500 shrink-0"><Pencil className="h-3.5 w-3.5" /></button>
                  {confirmDelete === t.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => remove(t.id)} className="text-xs text-red-600 font-medium hover:underline">ยืนยัน</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-neutral-400">ยกเลิก</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(t.id)} className="text-neutral-300 hover:text-red-500 shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </>
              )}
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-neutral-400 text-center py-4">ยังไม่มีรีวิว</p>}
        </div>
      )}
    </div>
  );
}
