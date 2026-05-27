import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShoppingBag, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ประวัติการสั่งซื้อ — เซ้งร้าน.com" , robots: { index: false, follow: false } };

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  success: { label: "สำเร็จ", cls: "bg-green-100 text-green-700" },
  pending: { label: "รอดำเนินการ", cls: "bg-yellow-100 text-yellow-700" },
  failed: { label: "ล้มเหลว", cls: "bg-red-100 text-red-600" },
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawOrders } = await supabase
    .from("wallet_transactions")
    .select("id, amount, type, description, status, created_at")
    .eq("user_id", user.id)
    .eq("type", "spend")
    .order("created_at", { ascending: false })
    .limit(50);

  const orders = rawOrders as Array<{
    id: number;
    amount: number;
    type: string;
    description: string | null;
    status: string;
    created_at: string;
  }> | null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-bold text-neutral-900">ประวัติการสั่งซื้อ</h1>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        {!orders || orders.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-400">
            ยังไม่มีประวัติการสั่งซื้อ
          </div>
        ) : (
          <ul className="divide-y">
            {orders.map((order) => {
              const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, cls: "bg-neutral-100 text-neutral-500" };
              return (
                <li key={order.id} className="flex items-center gap-3 px-5 py-4 hover:bg-neutral-50">
                  <div className="flex-shrink-0 rounded-full p-2 bg-orange-50 text-orange-500">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">
                      {order.description ?? "การสั่งซื้อ"}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString("th-TH", {
                        day: "numeric", month: "short", year: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-neutral-800">
                      ฿{Math.floor(order.amount).toLocaleString("th-TH")}
                    </p>
                    <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </span>
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
