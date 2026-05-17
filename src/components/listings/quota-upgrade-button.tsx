"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { QuotaUpgradeModal } from "./quota-upgrade-modal";

interface QuotaUpgradeButtonProps {
  currentQuota: number;
}

export function QuotaUpgradeButton({ currentQuota }: QuotaUpgradeButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 px-3 py-2 text-sm font-medium text-orange-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        เพิ่มจำนวนประกาศ
      </button>

      {open && (
        <QuotaUpgradeModal
          currentQuota={currentQuota}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
