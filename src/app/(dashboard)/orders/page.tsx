import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShoppingBag, Receipt } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ประวัติการสั่งซื้อ — เซ้งร้าน.com", robots: { index: false, follow: false } };

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:        { label: "รอชำระเงิน",   cls: "bg-yellow-100 text-yellow-700" },
  slip_submitted: { label: "รอยืนยันสลิป", cls: "bg-blue-100 text-blue-700" },
  approved:       { label: "สำเร็จ",        cls: "bg-green-100 text-green-700" },
  rejected:       { label: "ไม่ผ่านการยืนยัน", cls: "bg-red-100 text-red-600" },
};

const ORDER_TYPE_MAP: Record<string, string> = {
  boost_premium:  "โปรโมท Premium หน้าแรก",
  boost_facebook: "โฆษณา Facebook",
  quota:          "เพิ่มจำนวนประกาศ",
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  type PaymentOrder = {
    id: string;
    reference: string;
    order_type: string;
    package_key: string;
    amount_baht: number;
    status: string;
    notes: string | null;
    created_at: string;
    listing_id: string | null;
    listings: { title: string } | null;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawOrders } = await (supabase as any)
    .from("payment_orders")
    .select("id, reference, order_type, package_key, amount_baht, status, notes, created_at, listing_id, listings(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const orders = rawOrders as PaymentOrder[] | null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-bold text-neutral-900">ประวัติการสั่งซื้อ</h1>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        {!orders || orders.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Receipt className="h-10 w-10 text-neutral-300 mx-auto" />
            <p className="text-sm text-neutral-400">ยังไม่มีประวัติการสั่งซื้อ</p>
          </div>
        ) : (
          <ul className="divide-y">
            {orders.map((order) => {
              const statusInfo = STATUS_MAP[order.status] ?? { label: order.status, cls: "bg-neutral-100 text-neutral-500" };
              const typeLabel = ORDER_TYPE_MAP[order.order_type] ?? order.order_type;
              const listing = order.listings;
              return (
                <li key={order.id} className="px-5 py-4 hover:bg-neutral-50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 rounded-full p-2 bg-orange-50 text-orange-500 mt-0.5">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-800">{typeLabel}</p>
                      {listing && (
                        <p className="text-xs text-neutral-500 truncate mt-0.5">{listing.title}</p>
                      )}
                      <p className="text-[11px] text-neutral-400 mt-1 font-mono">อ้างอิง: {order.reference}</p>
                      <p className="text-[11px] text-neutral-400">
                        {new Date(order.created_at).toLocaleDateString("th-TH", {
                          day: "numeric", month: "short", year: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                      {order.notes && (
                        <p className={`mt-1.5 text-xs rounded-lg px-2.5 py-1.5 leading-relaxed ${
                          order.status === "rejected"
                            ? "bg-red-50 text-red-700 border border-red-100"
                            : "bg-green-50 text-green-700 border border-green-100"
                        }`}>
                          💬 {order.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-neutral-800">
                        ฿{order.amount_baht.toLocaleString("th-TH")}
                      </p>
                      <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
