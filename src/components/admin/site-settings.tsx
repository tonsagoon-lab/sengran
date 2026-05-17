"use client";

import { useState } from "react";
import { CategoriesManager } from "./categories-manager";
import { BannersManager, ModalImagesManager } from "./banners-manager";
import { ProvincesManager } from "./provinces-manager";
import { BoostPackagesManager } from "./boost-packages-manager";
import { AnnouncementManager } from "./announcement-manager";
import { FaviconManager } from "./favicon-manager";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "categories", label: "หมวดหมู่" },
  { key: "banners", label: "แบนเนอร์" },
  { key: "provinces", label: "จังหวัด" },
  { key: "boost", label: "แพ็กเกจ Boost" },
  { key: "announcement", label: "ประกาศระบบ" },
  { key: "modal", label: "รูป popup" },
  { key: "favicon", label: "Favicon" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function SiteSettings() {
  const [tab, setTab] = useState<TabKey>("categories");

  return (
    <div className="rounded-xl border bg-white p-5 space-y-4">
      <h2 className="font-semibold text-neutral-800">ตั้งค่าเว็บไซต์</h2>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b pb-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="pt-1">
        {tab === "categories" && <CategoriesManager />}
        {tab === "banners" && <BannersManager />}
        {tab === "provinces" && <ProvincesManager />}
        {tab === "boost" && <BoostPackagesManager />}
        {tab === "announcement" && <AnnouncementManager />}
        {tab === "modal" && <ModalImagesManager />}
        {tab === "favicon" && <FaviconManager />}
      </div>
    </div>
  );
}
