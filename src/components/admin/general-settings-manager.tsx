"use client";

import { useState, useTransition } from "react";
import { updateSiteSettingAction } from "@/lib/actions/site-settings";

interface SettingToggleProps {
  label: string;
  description: string;
  settingKey: string;
  initialValue: boolean;
}

function SettingToggle({ label, description, settingKey, initialValue }: SettingToggleProps) {
  const [enabled, setEnabled] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      await updateSiteSettingAction(settingKey, next ? "true" : "false");
    });
  }

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div>
        <p className="text-sm font-medium text-neutral-800">{label}</p>
        <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
          enabled ? "bg-orange-500" : "bg-neutral-300"
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

interface GeneralSettingsManagerProps {
  showViewCount: boolean;
  showQuotaUpgradeButton: boolean;
}

export function GeneralSettingsManager({ showViewCount, showQuotaUpgradeButton }: GeneralSettingsManagerProps) {
  return (
    <div className="space-y-1">
      <SettingToggle
        label="แสดงจำนวนครั้งที่ดูในหน้าประกาศ"
        description="เปิด = ผู้ใช้เห็นว่าประกาศมีคนดูกี่ครั้ง"
        settingKey="show_view_count"
        initialValue={showViewCount}
      />
      <SettingToggle
        label="แสดงปุ่ม 'เพิ่มจำนวนประกาศ'"
        description="เปิด = ผู้ใช้เห็นปุ่มซื้อโควต้าเพิ่มในหน้าประกาศของฉัน"
        settingKey="show_quota_upgrade_button"
        initialValue={showQuotaUpgradeButton}
      />
    </div>
  );
}
