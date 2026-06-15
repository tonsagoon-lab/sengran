"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, ImageIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  pending:        { label: "รอชำระ",       cls: "bg-yellow-100 text-yellow-700", icon: <Clock className="h-3.5 w-3.5" /> },
  slip_submitted: { label: "รอยืนยันสลิป", cls: "bg-blue-100 text-blue-700",    icon: <ImageIcon className="h-3.5 w-3.5" /> },
  approved:       { label: "อนุมัติแล้ว",  cls: "bg-green-100 text-green-700",  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  rejected:       { label: "ปฏิเสธ",       cls: "bg-red-100 text-red-600",      icon: <XCircle className="h-3.5 w-3.5" /> },
};

const ORDER_TYPE_MAP: Record<string, string> = {
  boost_premium:  "Premium หน้าแรก",
  boost_facebook: "โฆษณา Facebook",
  quota:          "เพิ่มจำนวนประกาศ",
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export function OrdersManager({ orders, siteUrl }: { orders: Order[]; siteUrl: string }) {
  const [filter, setFilter] = useState<"all" | "slip_submitted" | "pending" | "approved">("slip_submitted");
  const [slipModal, setSlipModal] = useState<string | null>(null);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  function approveUrl(order: Order) {
    return `${siteUrl}/api/orders/${order.reference}/approve?token=${order.approve_token}`;
  }

  function slipUrl(path: string) {
    return `${SUPABASE_URL}/storage/v1/object/public/listings/${path}`;
  }

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "slip_submitted", label: "รอยืนยันสลิป" },
          { key: "pending",        label: "รอชำระ" },
          { key: "approved",       label: "อนุมัติแล้ว" },
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
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Reference + status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-neutral-800">{order.reference}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.cls}`}>
                          {statusInfo.icon}{statusInfo.label}
                        </span>
                      </div>

                      {/* Package + amount */}
                      <p className="text-sm text-neutral-700">
                        {typeLabel} · <span className="font-semibold text-orange-600">฿{order.amount_baht.toLocaleString("th-TH")}</span>
                        <span className="ml-1 text-xs text-neutral-400">({order.package_key})</span>
                      </p>

                      {/* User */}
                      {order.user && (
                        <p className="text-xs text-neutral-500">
                          👤 {order.user.display_name ?? order.user_id.slice(0, 8) + "…"}
                        </p>
                      )}

                      {/* Listing */}
                      {order.listing && (
                        <p className="text-xs text-neutral-500 truncate">
                          📋{" "}
                          <a href={`/property/${order.listing.slug}`} target="_blank" rel="noopener noreferrer"
                            className="underline hover:text-orange-600">
                            {order.listing.title}
                          </a>
                        </p>
                      )}

                      {/* Date */}
                      <p className="text-[11px] text-neutral-400">
                        {new Date(order.created_at).toLocaleString("th-TH", {
                          day: "numeric", month: "short", year: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                        {order.processed_at && (
                          <span className="ml-2">
                            · อนุมัติ {new Date(order.processed_at).toLocaleString("th-TH", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {order.slip_storage_path && (
                        <Button size="sm" variant="outline"
                          className="text-xs h-8 gap-1.5"
                          onClick={() => setSlipModal(slipUrl(order.slip_storage_path!))}>
                          <ImageIcon className="h-3.5 w-3.5" />ดูสลิป
                        </Button>
                      )}
                      {order.status === "slip_submitted" && (
                        <a href={approveUrl(order)} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="text-xs h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-white w-full">
                            <CheckCircle2 className="h-3.5 w-3.5" />อนุมัติ
                          </Button>
                        </a>
                      )}
                    </div>
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
    </div>
  );
}
