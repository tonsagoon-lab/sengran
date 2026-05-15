"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, Trash2, EyeOff, Eye, AlertTriangle, Pencil, Settings2, Coins } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ListingRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  created_at: string;
  profiles: { display_name: string | null } | null;
  categories: { name_th: string } | null;
};

type UserRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  listingCount: number;
  listing_quota: number | null;
};

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="rounded-xl bg-white p-6 shadow-xl max-w-sm w-full space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-neutral-800">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600"
          >
            ยืนยันลบ
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Listings Manager ─────────────────────────────────────────────────────────

function ListingsManager() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; title: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/manage/listings?q=${encodeURIComponent(q)}`);
      setResults(await res.json());
      setLoading(false);
    }, 350);
  }, []);

  const handleToggleHide = async (row: ListingRow) => {
    const next = row.status === "hidden" ? "published" : "hidden";
    setBusy(row.id);
    await fetch("/api/admin/manage/listings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: row.id, status: next }),
    });
    setResults((prev) => prev.map((r) => r.id === row.id ? { ...r, status: next } : r));
    setBusy(null);
  };

  const handleDelete = async (id: string) => {
    setBusy(id);
    setConfirm(null);
    await fetch(`/api/admin/manage/listings?listingId=${id}`, { method: "DELETE" });
    setResults((prev) => prev.filter((r) => r.id !== id));
    setBusy(null);
  };

  const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    published: { label: "เผยแพร่", cls: "bg-green-100 text-green-700" },
    hidden:    { label: "ซ่อน",    cls: "bg-neutral-100 text-neutral-500" },
    sold:      { label: "ขายแล้ว", cls: "bg-blue-100 text-blue-700" },
    draft:     { label: "แบบร่าง",  cls: "bg-yellow-100 text-yellow-700" },
  };

  return (
    <div className="space-y-3">
      {confirm && (
        <ConfirmDialog
          message={`ลบประกาศ "${confirm.title}" อย่างถาวร? ไม่สามารถกู้คืนได้`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="ค้นหาชื่อประกาศ..."
          className="w-full rounded-lg border bg-neutral-50 pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-neutral-200 border-t-orange-400 animate-spin" />
        )}
      </div>

      {results.length > 0 && (
        <div className="rounded-lg border divide-y overflow-hidden">
          {results.map((row) => {
            const s = STATUS_LABEL[row.status] ?? { label: row.status, cls: "bg-neutral-100 text-neutral-500" };
            return (
              <div key={row.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-medium text-neutral-800 truncate max-w-xs">{row.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>{s.label}</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {row.categories?.name_th} · {row.profiles?.display_name ?? "ไม่ระบุ"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/listings/${row.id}/edit`}
                    title="แก้ไข"
                    className="rounded p-1.5 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    title={row.status === "hidden" ? "เผยแพร่" : "ซ่อน"}
                    disabled={busy === row.id}
                    onClick={() => handleToggleHide(row)}
                    className="rounded p-1.5 text-neutral-400 hover:text-orange-500 hover:bg-orange-50 disabled:opacity-40 transition-colors"
                  >
                    {row.status === "hidden"
                      ? <Eye className="h-4 w-4" />
                      : <EyeOff className="h-4 w-4" />
                    }
                  </button>
                  <button
                    title="ลบถาวร"
                    disabled={busy === row.id}
                    onClick={() => setConfirm({ id: row.id, title: row.title })}
                    className="rounded p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!loading && query && results.length === 0 && (
        <p className="text-xs text-neutral-400 text-center py-4">ไม่พบประกาศ</p>
      )}
    </div>
  );
}

// ─── Users Manager ────────────────────────────────────────────────────────────

function UsersManager() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; name: string; count: number } | null>(null);
  const [editQuota, setEditQuota] = useState<{ id: string; quota: number | null } | null>(null);
  const [grantCoin, setGrantCoin] = useState<{ id: string; amount: string; description: string } | null>(null);
  const [grantBusy, setGrantBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/manage/users?q=${encodeURIComponent(q)}`);
      setResults(await res.json());
      setLoading(false);
    }, 350);
  }, []);

  const handleDelete = async (id: string) => {
    setBusy(id);
    setConfirm(null);
    const res = await fetch(`/api/admin/manage/users?userId=${id}`, { method: "DELETE" });
    if (res.ok) {
      setResults((prev) => prev.filter((r) => r.id !== id));
    } else {
      const err = await res.json();
      alert(err.error ?? "เกิดข้อผิดพลาด");
    }
    setBusy(null);
  };

  const handleSaveQuota = async (userId: string, quota: number | null) => {
    await fetch("/api/admin/manage/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, listing_quota: quota }),
    });
    setResults((prev) => prev.map((r) => r.id === userId ? { ...r, listing_quota: quota } : r));
    setEditQuota(null);
  };

  const handleGrantCoin = async () => {
    if (!grantCoin) return;
    const amount = Number(grantCoin.amount);
    if (!amount || amount <= 0) return;
    setGrantBusy(true);
    await fetch("/api/admin/wallet/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: grantCoin.id,
        amount,
        description: grantCoin.description || `เพิ่ม coin โดย admin (${amount} coins)`,
      }),
    });
    setGrantCoin(null);
    setGrantBusy(false);
    alert(`เพิ่ม ${amount} coins สำเร็จ`);
  };

  return (
    <div className="space-y-3">
      {confirm && (
        <ConfirmDialog
          message={`ลบผู้ใช้ "${confirm.name}" และประกาศทั้งหมด ${confirm.count} รายการ? ไม่สามารถกู้คืนได้`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="ค้นหาชื่อหรืออีเมลผู้ใช้..."
          className="w-full rounded-lg border bg-neutral-50 pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-neutral-200 border-t-orange-400 animate-spin" />
        )}
      </div>

      {results.length > 0 && (
        <div className="rounded-lg border divide-y overflow-hidden">
          {results.map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-800 truncate">
                  {row.display_name ?? "—"}
                </p>
                <p className="text-[10px] text-neutral-400 truncate">
                  {row.email} · {row.listingCount} ประกาศ · โควต้า: {row.listing_quota ?? "ค่าเริ่มต้น"} · สมัคร {new Date(row.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                </p>
              </div>
              {editQuota?.id === row.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={editQuota.quota ?? ""}
                    placeholder="ค่าเริ่มต้น"
                    onChange={(e) => setEditQuota({ id: row.id, quota: e.target.value ? Number(e.target.value) : null })}
                    className="w-20 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300"
                  />
                  <button
                    onClick={() => handleSaveQuota(row.id, editQuota.quota)}
                    className="rounded p-1 text-xs bg-orange-500 text-white hover:bg-orange-600 px-2"
                  >บันทึก</button>
                  <button
                    onClick={() => setEditQuota(null)}
                    className="rounded p-1 text-xs text-neutral-400 hover:text-neutral-600"
                  >ยกเลิก</button>
                </div>
              ) : grantCoin?.id === row.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={1}
                    value={grantCoin.amount}
                    placeholder="จำนวน coins"
                    onChange={(e) => setGrantCoin({ ...grantCoin, amount: e.target.value })}
                    className="w-20 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300"
                  />
                  <input
                    type="text"
                    value={grantCoin.description}
                    placeholder="หมายเหตุ"
                    onChange={(e) => setGrantCoin({ ...grantCoin, description: e.target.value })}
                    className="w-24 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300"
                  />
                  <button
                    onClick={handleGrantCoin}
                    disabled={grantBusy}
                    className="rounded p-1 text-xs bg-amber-500 text-white hover:bg-amber-600 px-2 disabled:opacity-50"
                  >เพิ่ม</button>
                  <button
                    onClick={() => setGrantCoin(null)}
                    className="rounded p-1 text-xs text-neutral-400 hover:text-neutral-600"
                  >ยกเลิก</button>
                </div>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    title="เพิ่ม coins"
                    onClick={() => setGrantCoin({ id: row.id, amount: "", description: "" })}
                    className="rounded p-1.5 text-neutral-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                  >
                    <Coins className="h-4 w-4" />
                  </button>
                  <button
                    title="ตั้งโควต้าประกาศ"
                    onClick={() => setEditQuota({ id: row.id, quota: row.listing_quota })}
                    className="rounded p-1.5 text-neutral-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                  <button
                    title="ลบผู้ใช้และประกาศทั้งหมด"
                    disabled={busy === row.id}
                    onClick={() => setConfirm({ id: row.id, name: row.display_name ?? row.email ?? row.id, count: row.listingCount })}
                    className="rounded p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {!loading && query && results.length === 0 && (
        <p className="text-xs text-neutral-400 text-center py-4">ไม่พบผู้ใช้</p>
      )}
    </div>
  );
}

// ─── Tabbed wrapper ───────────────────────────────────────────────────────────

function ReportsManager() {
  const [reports, setReports] = useState<{ id: number; reason: string; detail: string | null; status: string; created_at: string; listings: { title: string; slug: string } | null }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/admin/manage/reports");
    setReports(await res.json());
    setLoaded(true);
  }

  async function updateStatus(id: number, status: string) {
    setBusy(id);
    await fetch("/api/admin/manage/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    setBusy(null);
  }

  if (!loaded) {
    return (
      <div className="text-center py-6">
        <button onClick={load} className="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600">
          โหลดรายงาน
        </button>
      </div>
    );
  }

  const pending = reports.filter((r) => r.status === "pending");
  const reviewed = reports.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-3">
      {reports.length === 0 && <p className="text-xs text-neutral-400 text-center py-4">ไม่มีรายงาน</p>}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-red-600">รอดำเนินการ ({pending.length})</p>
          {pending.map((r) => (
            <div key={r.id} className="rounded-lg border border-red-100 bg-red-50 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-800 truncate">{r.listings?.title ?? "ประกาศที่ถูกลบ"}</p>
                  <p className="text-xs text-neutral-600 mt-0.5">{r.reason}</p>
                  {r.detail && <p className="text-[10px] text-neutral-400 mt-0.5">{r.detail}</p>}
                  <p className="text-[10px] text-neutral-400">{new Date(r.created_at).toLocaleDateString("th-TH")}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button disabled={busy === r.id} onClick={() => updateStatus(r.id, "reviewed")} className="rounded px-2 py-1 text-[10px] bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50">ดำเนินการแล้ว</button>
                  <button disabled={busy === r.id} onClick={() => updateStatus(r.id, "dismissed")} className="rounded px-2 py-1 text-[10px] bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-50">ยกเลิก</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {reviewed.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-neutral-400">ดำเนินการแล้ว ({reviewed.length})</p>
          {reviewed.map((r) => (
            <div key={r.id} className="rounded-lg border bg-neutral-50 px-3 py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-neutral-600 truncate">{r.listings?.title ?? "—"} · {r.reason}</p>
              </div>
              <span className={`shrink-0 text-[10px] font-medium ${r.status === "reviewed" ? "text-green-600" : "text-neutral-400"}`}>
                {r.status === "reviewed" ? "แก้แล้ว" : "ยกเลิก"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContentManager({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<"listings" | "users" | "reports">("listings");

  return (
    <div className="rounded-xl border bg-white p-5 space-y-4">
      <div className="flex items-center gap-1 border-b pb-3">
        <button
          onClick={() => setTab("listings")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "listings"
              ? "bg-orange-500 text-white"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          จัดการประกาศ
        </button>
        <button
          onClick={() => setTab("users")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "users"
              ? "bg-orange-500 text-white"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          จัดการผู้ใช้
        </button>
        {isAdmin && (
          <button
            onClick={() => setTab("reports")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "reports"
                ? "bg-orange-500 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            รายงานปัญหา
          </button>
        )}
      </div>

      {tab === "listings" ? <ListingsManager /> : tab === "users" ? <UsersManager /> : isAdmin ? <ReportsManager /> : <ListingsManager />}
    </div>
  );
}
