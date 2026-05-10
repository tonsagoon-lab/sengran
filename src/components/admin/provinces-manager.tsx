"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

interface Province {
  id: number;
  name_th: string;
  name_en: string;
  slug: string;
  region: string;
  is_active: boolean;
}

const REGIONS: Record<string, string> = {
  north: "ภาคเหนือ",
  northeast: "ภาคอีสาน",
  central: "ภาคกลาง",
  east: "ภาคตะวันออก",
  west: "ภาคตะวันตก",
  south: "ภาคใต้",
};

export function ProvincesManager() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/provinces")
      .then((r) => r.json())
      .then(setProvinces)
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (p: Province) => {
    const next = !p.is_active;
    setProvinces((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: next } : x));
    await fetch("/api/admin/provinces", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, is_active: next }),
    });
  };

  const filtered = provinces.filter(
    (p) => p.name_th.includes(search) || p.name_en.toLowerCase().includes(search.toLowerCase())
  );

  const byRegion = filtered.reduce<Record<string, Province[]>>((acc, p) => {
    if (!acc[p.region]) acc[p.region] = [];
    acc[p.region].push(p);
    return acc;
  }, {});

  const activeCount = provinces.filter((p) => p.is_active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาจังหวัด..."
          className="h-8 text-sm max-w-xs"
        />
        <span className="text-xs text-neutral-500 shrink-0">แสดง {activeCount}/{provinces.length} จังหวัด</span>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">กำลังโหลด...</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(byRegion).map(([region, provs]) => (
            <div key={region}>
              <p className="text-xs font-semibold text-neutral-500 mb-2">{REGIONS[region] ?? region}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {provs.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => toggle(p)}
                    className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                      p.is_active
                        ? "bg-orange-50 border-orange-200 text-orange-800"
                        : "bg-neutral-50 border-neutral-200 text-neutral-400 line-through"
                    }`}
                  >
                    {p.name_th}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-neutral-400 text-center py-4">ไม่พบจังหวัดที่ค้นหา</p>}
        </div>
      )}
    </div>
  );
}
