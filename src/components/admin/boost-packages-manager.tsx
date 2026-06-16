"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X } from "lucide-react";

interface BoostPackage {
  id: number;
  name_th: string;
  price_thb: number;
  duration_days: number;
  package_type: string;
  reach_text: string | null;
  is_active: boolean;
  display_order: number;
}

const EMPTY = { name_th: "", price_thb: "", duration_days: "", package_type: "facebook", reach_text: "" };
type FormState = typeof EMPTY;

const TYPE_LABEL: Record<string, string> = { premium: "Premium", facebook: "Facebook" };
const TYPE_COLOR: Record<string, string> = {
  premium: "bg-orange-100 text-orange-700",
  facebook: "bg-indigo-100 text-indigo-700",
};

export function BoostPackagesManager() {
  const [packages, setPackages] = useState<BoostPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/boost-packages");
    setPackages(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (pkg: BoostPackage) => {
    await fetch("/api/admin/boost-packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pkg.id, is_active: !pkg.is_active }),
    });
    setPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, is_active: !p.is_active } : p));
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...packages];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const updated = next.map((p, i) => ({ ...p, display_order: i }));
    setPackages(updated);
    await Promise.all(
      updated.map((p) =>
        fetch("/api/admin/boost-packages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: p.id, display_order: p.display_order }),
        })
      )
    );
  };

  const add = async () => {
    if (!form.name_th.trim() || !form.price_thb || !form.duration_days) return;
    setSaving(true);
    const res = await fetch("/api/admin/boost-packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name_th: form.name_th,
        price_thb: Number(form.price_thb),
        duration_days: Number(form.duration_days),
        package_type: form.package_type,
        reach_text: form.reach_text.trim() || null,
        display_order: packages.length,
      }),
    });
    if (res.ok) { setForm(EMPTY); await load(); }
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    await fetch("/api/admin/boost-packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editId,
        name_th: editForm.name_th,
        price_thb: Number(editForm.price_thb),
        duration_days: Number(editForm.duration_days),
        package_type: editForm.package_type,
        reach_text: editForm.reach_text.trim() || null,
      }),
    });
    setEditId(null);
    await load();
    setSaving(false);
  };

  const deletePkg = async (id: number) => {
    await fetch("/api/admin/boost-packages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setConfirmDelete(null);
    setPackages((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="rounded-lg border bg-neutral-50 p-4 space-y-3">
        <p className="text-sm font-medium text-neutral-700">เพิ่มแพ็กเกจ</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs">ชื่อแพ็กเกจ</Label>
            <Input value={form.name_th} onChange={(e) => setForm({ ...form, name_th: e.target.value })} placeholder="เช่น โฆษณา Facebook 10 วัน" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ราคา (บาท)</Label>
            <Input type="number" value={form.price_thb} onChange={(e) => setForm({ ...form, price_thb: e.target.value })} placeholder="1500" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ระยะเวลา (วัน)</Label>
            <Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} placeholder="10" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ประเภท</Label>
            <select value={form.package_type} onChange={(e) => setForm({ ...form, package_type: e.target.value })}
              className="w-full h-8 rounded-md border border-input bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="facebook">Facebook</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-2">
            <Label className="text-xs">คนเห็น (ไม่บังคับ)</Label>
            <Input value={form.reach_text} onChange={(e) => setForm({ ...form, reach_text: e.target.value })} placeholder="เช่น คนเห็น 20,000+ คน" className="h-8 text-sm" />
          </div>
        </div>
        <Button onClick={add} disabled={saving || !form.name_th.trim()} size="sm" className="bg-orange-500 hover:bg-orange-600 gap-1">
          <Plus className="h-3.5 w-3.5" /> เพิ่มแพ็กเกจ
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-neutral-400">กำลังโหลด...</p>
      ) : (
        <div className="divide-y rounded-lg border bg-white overflow-hidden">
          {packages.map((pkg, i) => (
            <div key={pkg.id} className="flex items-start gap-3 px-4 py-3">
              <div className="flex flex-col gap-0.5 shrink-0 mt-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20"><ChevronUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => move(i, 1)} disabled={i === packages.length - 1} className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20"><ChevronDown className="h-3.5 w-3.5" /></button>
              </div>

              {editId === pkg.id ? (
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <Input value={editForm.name_th} onChange={(e) => setEditForm({ ...editForm, name_th: e.target.value })} className="h-7 text-sm w-44" placeholder="ชื่อ" />
                  <Input type="number" value={editForm.price_thb} onChange={(e) => setEditForm({ ...editForm, price_thb: e.target.value })} className="h-7 text-sm w-20" placeholder="ราคา" />
                  <Input type="number" value={editForm.duration_days} onChange={(e) => setEditForm({ ...editForm, duration_days: e.target.value })} className="h-7 text-sm w-16" placeholder="วัน" />
                  <select value={editForm.package_type} onChange={(e) => setEditForm({ ...editForm, package_type: e.target.value })}
                    className="h-7 rounded-md border border-input bg-white px-2 text-sm focus:outline-none">
                    <option value="facebook">Facebook</option>
                    <option value="premium">Premium</option>
                  </select>
                  <Input value={editForm.reach_text} onChange={(e) => setEditForm({ ...editForm, reach_text: e.target.value })} className="h-7 text-sm w-40" placeholder="คนเห็น..." />
                  <button onClick={saveEdit} disabled={saving} className="text-green-600 hover:text-green-700"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditId(null)} className="text-neutral-400 hover:text-neutral-600"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-neutral-800">{pkg.name_th}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLOR[pkg.package_type] ?? "bg-neutral-100 text-neutral-500"}`}>
                      {TYPE_LABEL[pkg.package_type] ?? pkg.package_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-sm text-orange-600 font-medium">฿{pkg.price_thb.toLocaleString("th-TH")}</span>
                    <span className="text-xs text-neutral-400">{pkg.duration_days} วัน</span>
                    {pkg.reach_text && <span className="text-xs text-indigo-500">{pkg.reach_text}</span>}
                  </div>
                </div>
              )}

              {editId !== pkg.id && (
                <div className="flex items-center gap-2 shrink-0 mt-1">
                  <button
                    onClick={() => toggle(pkg)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium border ${pkg.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-neutral-100 text-neutral-500 border-neutral-200"}`}
                  >
                    {pkg.is_active ? "เปิด" : "ปิด"}
                  </button>
                  <button onClick={() => {
                    setEditId(pkg.id);
                    setEditForm({
                      name_th: pkg.name_th,
                      price_thb: String(pkg.price_thb),
                      duration_days: String(pkg.duration_days),
                      package_type: pkg.package_type,
                      reach_text: pkg.reach_text ?? "",
                    });
                  }} className="text-neutral-400 hover:text-orange-500">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {confirmDelete === pkg.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => deletePkg(pkg.id)} className="text-xs text-red-600 font-medium hover:underline">ยืนยัน</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-neutral-400">ยกเลิก</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(pkg.id)} className="text-neutral-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              )}
            </div>
          ))}
          {packages.length === 0 && <p className="text-sm text-neutral-400 text-center py-6">ยังไม่มีแพ็กเกจ</p>}
        </div>
      )}
    </div>
  );
}
