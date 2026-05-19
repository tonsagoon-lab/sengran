"use client";

import Link from "next/link";
import { Home, Search, Plus, Bookmark, User } from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "home" | "browse" | "post" | "saved" | "profile";

const TABS: {
  id: TabId;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
}[] = [
  { id: "home",    href: "/",             icon: Home,     label: "หน้าแรก" },
  { id: "browse",  href: "/listings",     icon: Search,   label: "ค้นหา" },
  { id: "post",    href: "/listings/new", icon: Plus,     label: "ลงประกาศ", primary: true },
  { id: "saved",   href: "/saved",        icon: Bookmark, label: "บันทึก" },
  { id: "profile", href: "/profile",      icon: User,     label: "โปรไฟล์" },
];

export function BottomNav({ active }: { active: TabId }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-neutral-200 bg-white pb-safe pb-2 pt-1.5 md:hidden">
      {TABS.map((t) => {
        const Icon = t.icon;
        const on = active === t.id;
        if (t.primary) {
          return (
            <Link key={t.id} href={t.href} className="flex flex-col items-center gap-0.5 text-neutral-500">
              <span className="-mt-3 grid size-11 place-items-center rounded-full bg-orange-500 text-white shadow-[0_4px_12px_rgb(249_115_22_/_0.4)] transition-transform hover:scale-105 active:scale-95">
                <Icon className="size-[22px]" />
              </span>
              <span className="text-[10px] font-semibold text-neutral-500">{t.label}</span>
            </Link>
          );
        }
        return (
          <Link
            key={t.id}
            href={t.href}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              on ? "text-orange-500" : "text-neutral-400 hover:text-neutral-600",
            )}
          >
            <Icon className="size-[22px]" />
            <span className={cn("text-[10px]", on ? "font-semibold" : "font-medium")}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
