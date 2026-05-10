"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X } from "lucide-react";

interface Category {
  id: number;
  name_th: string;
  slug: string;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function CategoriesManager() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/categories");
    setCats(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (cat: Category) => {
    await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id, is_active: !cat.is_active }),
    });
    setCats((prev) => prev.map((c) => c.id === cat.id ? { ...c, is_active: !c.is_active } : c));
  };

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setEditName(cat.name_th);
    setEditIcon(cat.icon ?? "");
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, name_th: editName, icon: editIcon || null }),
    });
    setCats((prev) => prev.map((c) => c.id === editId ? { ...c, name_th: editName, icon: editIcon || null } : c));
    setEditId(null);
    setSaving(false);
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...cats];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const updated = next.map((c, i) => ({ ...c, display_order: i }));
    setCats(updated);
    await Promise.all(
      updated.map((c) =>
        fetch("/api/admin/categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: c.id, display_order: c.display_order }),
        })
      )
    );
  };

  const addCat = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const slug = newSlug || slugify(newName);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name_th: newName, slug, icon: newIcon || null, display_order: cats.length }),
    });
    if (res.ok) {
      setNewName(""); setNewIcon(""); setNewSlug("");
      await load();
    }
    setSaving(false);
  };

  const deleteCat = async (id: number) => {
    await fetch("/api/admin/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setConfirmDelete(null);
    setCats((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="rounded-lg border bg-neutral-50 p-4 space-y-3">
        <p className="text-sm font-medium text-neutral-700">เพิ่มหมวดหมู่ใหม่</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">ชื่อ (ภาษาไทย)</Label>
            <Input value={newName} onChange={(e) => { setNewName(e.target.value); setNewSlug(slugify(e.target.value)); }} placeholder="เช่น ร้านอาหาร" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Slug (URL)</Label>
            <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="เช่น restaurant" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ไอคอน (emoji)</Label>
            <Input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="เช่น 🍜" className="h-8 text-sm w-24" />
          </div>
        </div>
        <Button onClick={addCat} disabled={saving || !newName.trim()} size="sm" className="bg-orange-500 hover:bg-orange-600 gap-1">
          <Plus className="h-3.5 w-3.5" /> เพิ่ม
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-neutral-400">กำลังโหลด...</p>
      ) : (
        <div className="divide-y rounded-lg border bg-white overflow-hidden">
          {cats.map((cat, i) => (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === cats.length - 1} className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Name / edit */}
              {editId === cat.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} className="h-7 w-14 text-sm text-center" placeholder="🏪" />
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-sm flex-1" />
                  <button onClick={saveEdit} disabled={saving} className="text-green-600 hover:text-green-700"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditId(null)} className="text-neutral-400 hover:text-neutral-600"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-neutral-800">{cat.name_th}</span>
                </div>
              )}

              {/* Actions */}
              {editId !== cat.id && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggle(cat)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium border ${cat.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-neutral-100 text-neutral-500 border-neutral-200"}`}
                  >
                    {cat.is_active ? "แสดง" : "ซ่อน"}
                  </button>
                  <button onClick={() => startEdit(cat)} className="text-neutral-400 hover:text-orange-500">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {confirmDelete === cat.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => deleteCat(cat.id)} className="text-xs text-red-600 font-medium hover:underline">ยืนยันลบ</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-neutral-400">ยกเลิก</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(cat.id)} className="text-neutral-300 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
