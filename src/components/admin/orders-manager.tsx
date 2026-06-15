"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, ImageIcon, ExternalLink, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type Order = {
  id: string;
  reference: string;
  order_type: string;
  package_key: string;
  amount_baht: number;
  status: string;
  slip_storage_path: string | null;
  approve_token: string;
  created_at: string;
  processed_at: string | null;
  user_id: string;
  user: { display_name: string | null } | null;
  listing: { title: string; slug: string } | null;
};

const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending:        { label: "รอชำระ",        cls: "bg-yellow-100 text-yellow-700", icon: <Clock className="h-3.5 w-3.5" /> },
  slip_submitted: { label: "รอยืนยันสลิป",  cls: "bg-blue-100 text-blue-700",    icon: <ImageIcon className="h-3.5 w-3.5" /> },
  approved:       { label: "อนุมัติแล้ว",   cls: "bg-green-100 text-green-700",  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  rejected:       { label: "ปฏิเสธ",        cls: "bg-red-100 text-red-600",      icon: <XCircle className="h-3.5 w-3.5" /> },
};

const ORDER_TYPE_MAP: Record<string, string> = {
  boost_premium:  "Premium หน้าแรก",
  boost_facebook: "โฆษณา Facebook",
  quota:          "เพิ่มจำนวนประกาศ",
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

type ActionModal = { order: Order; action: "approve" | "reject" };

export function OrdersManager({ orders: initialOrders, siteUrl }: { orders: Order[]; siteUrl: string }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<"all" | "slip_submitted" | "pending" | "approved" | "rejected">("slip_submitted");
  const [slipModal, setSlipModal] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  function slipUrl(path: string) {
    return `${SUPABASE_URL}/storage/v1/object/public/listings/${path}`;
  }

  function openAction(order: Order, action: "approve" | "reject") {
    setNote("");
    setActionError(null);
    setActionModal({ order, action });
  }

  async function submitAction() {
    if (!actionModal) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/orders/${actionModal.order.reference}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionModal.action, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error ?? "เกิดข้อผิดพลาด"); return; }

      // Update local state
      const newStatus = actionModal.action === "approve" ? "approved" : "rejected";
      setOrders((prev) => prev.map((o) =>
        o.reference === actionModal.order.reference
          ? { ...o, status: newStatus, processed_at: new Date().toISOString() }
          : o
      ));
      setActionModal(null);
      router.refresh();
    } catch {
      setActionError("เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  const isApprove = actionModal?.action === "approve";

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "slip_submitted", label: "รอยืนยันสลิป" },
          { key: "pending",        label: "รอชำระ" },
          { key: "approved",       label: "อนุมัติแล้ว" },
          { key: "rejected",       label: "ปฏิเสธ" },
          { key: "all",            label: "ทั้งหมด" },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key as typeof filter)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              filter === f.key ? "bg-orange-500 text-white border-orange-500" : "bg-white text-neutral-600 border-neutral-200 hover:border-orange-300"
            }`}>
            {f.label}
            {f.key !== "all" && (
              <span className="ml-1.5 text-[10px] opacity-70">
                ({orders.filter((o) => o.status === f.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Order list */}
      <div className="rounded-xl border bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-400">ไม่มีคำสั่งซื้อ</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((order) => {
              const statusInfo = STATUS_MAP[order.status] ?? { label: order.status, cls: "bg-neutral-100 text-neutral-500", icon: null };
              const typeLabel = ORDER_TYPE_MAP[order.order_type] ?? order.order_type;
              return (
                <li key={order.id} className="px-5 py-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold text-neutral-800">{order.reference}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.cls}`}>
                            {statusInfo.icon}{statusInfo.label}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-700">
                          {typeLabel} · <span className="font-semibold text-orange-600">฿{order.amount_baht.toLocaleString("th-TH")}</span>
                          <span className="ml-1 text-xs text-neutral-400">({order.package_key})</span>
                        </p>
                        {order.user && (
                          <p className="text-xs text-neutral-500">👤 {order.user.display_name ?? order.user_id.slice(0, 8) + "…"}</p>
                        )}
                        {order.listing && (
                          <p className="text-xs text-neutral-500 truncate">
                            📋{" "}
                            <a href={`/property/${order.listing.slug}`} target="_blank" rel="noopener noreferrer"
                              className="underline hover:text-orange-600">{order.listing.title}</a>
                          </p>
                        )}
                        <p className="text-[11px] text-neutral-400">
                          {new Date(order.created_at).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          {order.processed_at && (
                            <span className="ml-2">· {order.status === "approved" ? "อนุมัติ" : "ปฏิเสธ"} {new Date(order.processed_at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          )}
                        </p>
                      </div>
                      {order.slip_storage_path && (
                        <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 shrink-0"
                          onClick={() => setSlipModal(slipUrl(order.slip_storage_path!))}>
                          <ImageIcon className="h-3.5 w-3.5" />ดูสลิป
                        </Button>
                      )}
                    </div>

                    {/* Approve / Reject buttons — full width row */}
                    {order.status === "slip_submitted" && (
                      <div className="flex gap-2">
                        <Button size="sm"
                          className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => openAction(order, "approve")}>
                          <CheckCircle2 className="h-3.5 w-3.5" />อนุมัติ
                        </Button>
                        <Button size="sm" variant="outline"
                          className="flex-1 gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => openAction(order, "reject")}>
                          <XCircle className="h-3.5 w-3.5" />ไม่อนุมัติ
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Slip preview modal */}
      {slipModal && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/70" onClick={() => setSlipModal(null)} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto max-w-sm w-full space-y-2">
              <img src={slipModal} alt="slip" className="rounded-xl w-full object-contain max-h-[80vh] shadow-2xl" />
              <div className="flex gap-2">
                <a href={slipModal} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="outline" className="w-full gap-1.5 bg-white text-xs">
                    <ExternalLink className="h-3.5 w-3.5" />เปิดในแท็บใหม่
                  </Button>
                </a>
                <Button variant="outline" className="bg-white text-xs" onClick={() => setSlipModal(null)}>ปิด</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Approve / Reject modal */}
      {actionModal && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/50" onClick={() => !submitting && setActionModal(null)} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <div>
                <h3 className={`text-base font-bold ${isApprove ? "text-green-700" : "text-red-600"}`}>
                  {isApprove ? "✅ อนุมัติคำสั่งซื้อ" : "❌ ปฏิเสธคำสั่งซื้อ"}
                </h3>
                <p className="text-sm text-neutral-500 mt-0.5 font-mono">{actionModal.order.reference}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  ข้อความถึงลูกค้า <span className="text-neutral-400 font-normal">(ไม่บังคับ)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={isApprove ? "เช่น ดำเนินการเรียบร้อยแล้ว" : "เช่น สลิปไม่ชัด กรุณาส่งใหม่"}
                  rows={3}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
                  autoFocus
                />
              </div>

              {actionError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{actionError}</div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setActionModal(null)} disabled={submitting}>
                  ยกเลิก
                </Button>
                <Button
                  className={`flex-1 gap-1.5 text-white ${isApprove ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"}`}
                  onClick={submitAction}
                  disabled={submitting}
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "กำลังส่ง..." : isApprove ? "ยืนยันอนุมัติ" : "ยืนยันปฏิเสธ"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
