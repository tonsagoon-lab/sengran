"use client";

import { useState } from "react";
import Link from "next/link";
import { Flag, CheckCircle, XCircle, Clock } from "lucide-react";

type Report = {
  id: number;
  reason: string;
  detail: string | null;
  status: "pending" | "reviewed" | "dismissed";
  created_at: string;
  listing_id: string;
  listings: { title: string; slug: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "รอดำเนินการ",
  reviewed: "ตรวจสอบแล้ว",
  dismissed: "ยกเลิก",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  reviewed: "bg-green-100 text-green-700",
  dismissed: "bg-neutral-100 text-neutral-500",
};

export function ReportsManager({ initialReports }: { initialReports: Report[] }) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "dismissed">("pending");
  const [loading, setLoading] = useState<number | null>(null);

  const filtered = filter === "all" ? reports : reports.filter((r) => r.status === filter);
  const pendingCount = reports.filter((r) => r.status === "pending").length;

  async function updateStatus(id: number, status: "reviewed" | "dismissed") {
    setLoading(id);
    await fetch("/api/admin/manage/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    setLoading(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-neutral-800 flex items-center gap-2">
          <Flag className="h-4 w-4 text-red-500" />
          รายงานปัญหาจากผู้ใช้
          {pendingCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              {pendingCount}
            </span>
          )}
        </h2>
        <div className="flex gap-1">
          {(["pending", "reviewed", "dismissed", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === s
                  ? "bg-orange-500 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {s === "all" ? "ทั้งหมด" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-white py-12 text-center text-sm text-neutral-400">
          {filter === "pending" ? "ไม่มีรายงานที่รอดำเนินการ ✅" : "ไม่มีรายการ"}
        </div>
      ) : (
        <div className="divide-y rounded-xl border bg-white overflow-hidden">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-start gap-3 px-4 py-3">
              <div className="mt-0.5 shrink-0">
                {r.status === "pending" && <Clock className="h-4 w-4 text-yellow-500" />}
                {r.status === "reviewed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                {r.status === "dismissed" && <XCircle className="h-4 w-4 text-neutral-400" />}
              </div>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-neutral-800">{r.reason}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                {r.detail && (
                  <p className="text-xs text-neutral-500">{r.detail}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
                  {r.listings ? (
                    <Link
                      href={`/property/${r.listings.slug}`}
                      target="_blank"
                      className="text-orange-500 hover:underline truncate max-w-[200px]"
                    >
                      {r.listings.title}
                    </Link>
                  ) : (
                    <span className="text-neutral-400">ประกาศถูกลบแล้ว</span>
                  )}
                  <span>•</span>
                  <span>
                    {new Date(r.created_at).toLocaleDateString("th-TH", {
                      day: "numeric", month: "short", year: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {r.status === "pending" && (
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => updateStatus(r.id, "reviewed")}
                    disabled={loading === r.id}
                    className="rounded-lg bg-green-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
                  >
                    ตรวจแล้ว
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, "dismissed")}
                    disabled={loading === r.id}
                    className="rounded-lg bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-300 disabled:opacity-50 transition-colors"
                  >
                    ยกเลิก
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
