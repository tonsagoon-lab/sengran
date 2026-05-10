"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "articles", label: "บทความ" },
  { key: "settings", label: "ตั้งค่าเว็บไซต์" },
] as const;

export function AdminTabs() {
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
            "px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            current === t.key
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
