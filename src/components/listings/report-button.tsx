"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";

const REASONS = [
  "ข้อมูลเท็จหรือทำให้เข้าใจผิด",
  "ประกาศซ้ำ",
  "ราคาไม่ถูกต้อง",
  "ร้านถูกขายหรือเซ้งแล้ว",
  "รูปภาพไม่ตรงกับความเป็นจริง",
  "เนื้อหาไม่เหมาะสม",
  "อื่นๆ",
];

export function ReportButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setStatus("sending");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, reason, detail }),
    });
    setStatus(res.ok ? "done" : "error");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-500 transition-colors"
      >
        <Flag className="h-3.5 w-3.5" />
        แจ้งปัญหา
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-neutral-800">แจ้งปัญหาประกาศนี้</h3>
              <button onClick={() => { setOpen(false); setStatus("idle"); }} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {status === "done" ? (
              <div className="py-4 text-center space-y-2">
                <p className="text-2xl">✅</p>
                <p className="text-sm text-neutral-700">รับเรื่องแล้ว ขอบคุณที่แจ้ง</p>
                <button onClick={() => { setOpen(false); setStatus("idle"); }} className="mt-2 rounded-lg bg-orange-500 px-4 py-1.5 text-sm text-white hover:bg-orange-600">
                  ปิด
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700">เหตุผล *</label>
                  <div className="space-y-1">
                    {REASONS.map((r) => (
                      <label key={r} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="reason"
                          value={r}
                          checked={reason === r}
                          onChange={() => setReason(r)}
                          className="accent-orange-500"
                        />
                        <span className="text-sm text-neutral-700 group-hover:text-neutral-900">{r}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700">รายละเอียดเพิ่มเติม (ไม่บังคับ)</label>
                  <textarea
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                    placeholder="อธิบายเพิ่มเติม..."
                  />
                </div>
                {status === "error" && <p className="text-xs text-red-600">เกิดข้อผิดพลาด กรุณาลองใหม่</p>}
                <button
                  type="submit"
                  disabled={!reason || status === "sending"}
                  className="w-full rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {status === "sending" ? "กำลังส่ง..." : "ส่งรายงาน"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
