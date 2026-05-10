"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, GripVertical, Star, Plus } from "lucide-react";

type Pick = {
  id: number;
  listing_id: string;
  display_order: number;
  listings: {
    id: string; title: string; slug: string;
    categories: { name_th: string } | null;
    provinces: { name_th: string } | null;
  };
};

type SearchResult = {
  id: string; title: string; slug: string;
  categories: { name_th: string } | null;
  provinces: { name_th: string } | null;
};

const MAX_PICKS = 8;

export function PicksManager() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickIds = new Set(picks.map((p) => p.listing_id));

  const loadPicks = useCallback(async () => {
    const res = await fetch("/api/admin/picks");
    const data = await res.json();
    setPicks(data);
  }, []);

  useEffect(() => { loadPicks(); }, [loadPicks]);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/admin/picks?q=${encodeURIComponent(q)}`);
      setResults(await res.json());
      setSearching(false);
    }, 350);
  };

  const handleAdd = async (listingId: string) => {
    setSaving(listingId);
    const res = await fetch("/api/admin/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    if (res.ok) {
      await loadPicks();
      setResults((prev) => prev.filter((r) => r.id !== listingId));
    } else {
      const err = await res.json();
      alert(err.error ?? "เกิดข้อผิดพลาด");
    }
    setSaving(null);
  };

  const handleRemove = async (listingId: string) => {
    setSaving(listingId);
    await fetch(`/api/admin/picks?listingId=${listingId}`, { method: "DELETE" });
    await loadPicks();
    setSaving(null);
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newPicks = [...picks];
    [newPicks[index - 1], newPicks[index]] = [newPicks[index], newPicks[index - 1]];
    setPicks(newPicks);
    await fetch("/api/admin/picks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: newPicks.map((p) => p.listing_id) }),
    });
  };

  const handleMoveDown = async (index: number) => {
    if (index === picks.length - 1) return;
    const newPicks = [...picks];
    [newPicks[index], newPicks[index + 1]] = [newPicks[index + 1], newPicks[index]];
    setPicks(newPicks);
    await fetch("/api/admin/picks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: newPicks.map((p) => p.listing_id) }),
    });
  };

  return (
    <div className="rounded-xl border bg-white p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-orange-500 fill-orange-400" />
          <h2 className="font-semibold text-sm text-neutral-800">โพสแนะนำ</h2>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${picks.length >= MAX_PICKS ? "bg-red-100 text-red-600" : "bg-neutral-100 text-neutral-500"}`}>
          {picks.length}/{MAX_PICKS}
        </span>
      </div>

      {/* Current picks list */}
      {picks.length > 0 ? (
        <div className="space-y-1.5">
          {picks.map((pick, i) => (
            <div
              key={pick.listing_id}
              className="flex items-center gap-2 rounded-lg border bg-neutral-50 px-3 py-2"
            >
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => handleMoveUp(i)}
                  disabled={i === 0}
                  className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20 text-[10px] leading-none"
                >▲</button>
                <button
                  onClick={() => handleMoveDown(i)}
                  disabled={i === picks.length - 1}
                  className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20 text-[10px] leading-none"
                >▼</button>
              </div>
              <GripVertical className="h-3.5 w-3.5 text-neutral-300 shrink-0" />
              <span className="w-5 text-center text-xs text-neutral-400 font-medium shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-800 truncate">{pick.listings.title}</p>
                <p className="text-[10px] text-neutral-400">
                  {pick.listings.categories?.name_th}{pick.listings.provinces?.name_th ? ` · ${pick.listings.provinces.name_th}` : ""}
                </p>
              </div>
              <button
                onClick={() => handleRemove(pick.listing_id)}
                disabled={saving === pick.listing_id}
                className="shrink-0 text-neutral-300 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-neutral-400 text-center py-3">ยังไม่มีโพสแนะนำ</p>
      )}

      {/* Search to add */}
      {picks.length < MAX_PICKS && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="ค้นหาประกาศเพื่อเพิ่ม..."
              className="w-full rounded-lg border bg-neutral-50 pl-8 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-neutral-200 border-t-orange-400 animate-spin" />
            )}
          </div>
          {results.length > 0 && (
            <div className="rounded-lg border divide-y max-h-52 overflow-y-auto">
              {results.map((r) => {
                const isAdded = pickIds.has(r.id);
                return (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-neutral-800 truncate">{r.title}</p>
                      <p className="text-[10px] text-neutral-400">
                        {r.categories?.name_th}{r.provinces?.name_th ? ` · ${r.provinces.name_th}` : ""}
                      </p>
                    </div>
                    {isAdded ? (
                      <span className="text-[10px] text-green-600 font-medium shrink-0">เพิ่มแล้ว</span>
                    ) : (
                      <button
                        onClick={() => handleAdd(r.id)}
                        disabled={saving === r.id || picks.length >= MAX_PICKS}
                        className="shrink-0 flex items-center gap-1 rounded-full bg-orange-500 text-white px-2.5 py-1 text-[10px] font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        เพิ่ม
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {picks.length >= MAX_PICKS && (
        <p className="text-xs text-red-500 text-center">ครบ {MAX_PICKS} โพสแนะนำแล้ว ลบออกก่อนเพื่อเพิ่มใหม่</p>
      )}
    </div>
  );
}
