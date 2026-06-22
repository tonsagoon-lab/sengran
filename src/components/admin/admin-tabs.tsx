"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "equipment", label: "ขายอุปกรณ์" },
  { key: "orders", label: "คำสั่งซื้อ" },
  { key: "reports", label: "แจ้งปัญหา" },
  { key: "articles", label: "บทความ" },
  { key: "settings", label: "ตั้งค่าเว็บไซต์" },
] as const;

export function AdminTabs({ pendingReports = 0, pendingOrders = 0 }: { pendingReports?: number; pendingOrders?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("tab") ?? "dashboard";

  return (
    <div className="flex gap-1 border-b">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => router.push(`/admin?tab=${t.key}`)}
          className={cn(
            "relative px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            current === t.key
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          )}
        >
          {t.label}
          {t.key === "reports" && pendingReports > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
              {pendingReports}
            </span>
          )}
          {t.key === "orders" && pendingOrders > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
              {pendingOrders}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
