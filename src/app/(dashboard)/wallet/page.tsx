import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Coins, Plus, ArrowDownLeft, ArrowUpRight, Gift, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "กระเป๋า coin — เซ้งร้าน.com" };

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  topup: {
    label: "เติม coin",
    icon: <ArrowDownLeft className="h-4 w-4" />,
    color: "text-green-600",
  },
  spend: {
    label: "ใช้",
    icon: <ArrowUpRight className="h-4 w-4" />,
    color: "text-red-500",
  },
  admin_grant: {
    label: "เพิ่มโดย admin",
    icon: <ShieldCheck className="h-4 w-4" />,
    color: "text-blue-600",
  },
  bonus: {
    label: "โบนัส",
    icon: <Gift className="h-4 w-4" />,
    color: "text-orange-500",
  },
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  success: { label: "สำเร็จ", cls: "bg-green-100 text-green-700" },
  pending: { label: "รอดำเนินการ", cls: "bg-yellow-100 text-yellow-700" },
  failed: { label: "ล้มเหลว", cls: "bg-red-100 text-red-600" },
};

export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", user.id)
    .single();

  const { data: rawTransactions } = await supabase
    .from("wallet_transactions")
    .select("id, amount, type, description, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const transactions = rawTransactions as Array<{
    id: number;
    amount: number;
    type: string;
    description: string | null;
    status: string;
    created_at: string;
  }> | null;

  const balance = Math.floor(Number(profile?.wallet_balance ?? 0));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">กระเป๋า coin</h1>

      {/* Balance card */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Coins className="h-5 w-5 opacity-80" />
          <span className="text-sm font-medium opacity-80">ยอด coin คงเหลือ</span>
        </div>
        <p className="text-5xl font-bold tracking-tight">
          {balance.toLocaleString("th-TH")}
        </p>
        <p className="text-sm opacity-70 mt-1">coins</p>

        <Link
          href="/wallet/topup"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 px-5 py-2.5 text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" />
          เติม coin
        </Link>
      </div>

      {/* Transaction history */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b">
          <h2 className="text-sm font-semibold text-neutral-800">ประวัติธุรกรรม</h2>
        </div>

        {!transactions || transactions.length === 0 ? (
          <div className="py-12 text-center text-sm text-neutral-400">
            ยังไม่มีประวัติธุรกรรม
          </div>
        ) : (
          <ul className="divide-y">
            {transactions.map((tx) => {
              const typeInfo = TYPE_LABELS[tx.type] ?? {
                label: tx.type,
                icon: <Coins className="h-4 w-4" />,
                color: "text-neutral-600",
              };
              const statusInfo = STATUS_LABELS[tx.status] ?? {
                label: tx.status,
                cls: "bg-neutral-100 text-neutral-500",
              };
              const isCredit = tx.type === "topup" || tx.type === "admin_grant" || tx.type === "bonus";

              return (
                <li key={tx.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-neutral-50">
                  <div className={`flex-shrink-0 rounded-full p-2 ${isCredit ? "bg-green-50" : "bg-red-50"} ${typeInfo.color}`}>
                    {typeInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">
                      {tx.description ?? typeInfo.label}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${isCredit ? "text-green-600" : "text-red-500"}`}>
                      {isCredit ? "+" : "-"}{Math.floor(tx.amount).toLocaleString("th-TH")}
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
