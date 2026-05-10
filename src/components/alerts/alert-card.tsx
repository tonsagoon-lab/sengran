"use client";

import { useTransition } from "react";
import { toggleAlertAction, deleteAlertAction } from "@/lib/actions/alerts";
import { AlertForm } from "./alert-form";
import type { AlertPreference } from "@/lib/db/alerts";
import { Pencil, Trash2 } from "lucide-react";

interface Props {
  alert: AlertPreference;
  provinces: { id: number; name_th: string }[];
  categories: { id: number; name_th: string }[];
}

const TYPE_LABELS: Record<string, string> = {
  sale: "เซ้ง", rent: "ให้เช่า", both: "เซ้งและให้เช่า",
};

function formatPrice(n: number) {
  return n.toLocaleString("th-TH");
}

function describeAlert(alert: AlertPreference, provinces: { id: number; name_th: string }[]) {
  const parts: string[] = [];

  if (alert.province_ids.length > 0) {
    const names = alert.province_ids
      .map((id) => provinces.find((p) => p.id === id)?.name_th)
      .filter(Boolean);
    parts.push(names.join(", "));
  } else {
    parts.push("ทุกจังหวัด");
  }

  if (alert.categories?.name_th) parts.push(alert.categories.name_th);
  if (alert.listing_type) parts.push(TYPE_LABELS[alert.listing_type] ?? alert.listing_type);

  if (alert.min_price && alert.max_price) {
    parts.push(`${formatPrice(alert.min_price)}–${formatPrice(alert.max_price)} บาท`);
  } else if (alert.min_price) {
    parts.push(`ตั้งแต่ ${formatPrice(alert.min_price)} บาท`);
  } else if (alert.max_price) {
    parts.push(`ไม่เกิน ${formatPrice(alert.max_price)} บาท`);
  }

  return parts.join(" • ");
}

export function AlertCard({ alert, provinces, categories }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className={`rounded-xl border bg-white p-4 flex items-center gap-4 transition-opacity ${!alert.is_active ? "opacity-60" : ""}`}>
      {/* Toggle */}
      <button
        disabled={pending}
        onClick={() => startTransition(() => void toggleAlertAction(alert.id, !alert.is_active))}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${alert.is_active ? "bg-orange-500" : "bg-neutral-200"}`}
        title={alert.is_active ? "ปิดการแจ้งเตือน" : "เปิดการแจ้งเตือน"}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${alert.is_active ? "translate-x-5" : "translate-x-0"}`} />
      </button>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 truncate">
          {describeAlert(alert, provinces)}
        </p>
        <p className="text-xs text-neutral-400 mt-0.5">
          {alert.is_active ? "รับการแจ้งเตือน" : "ปิดการแจ้งเตือน"}
        </p>
      </div>

      {/* Edit */}
      <AlertForm
        provinces={provinces}
        categories={categories}
        editing={alert}
        trigger={
          <button className="p-1.5 rounded-lg text-neutral-400 hover:text-orange-500 hover:bg-orange-50 transition-colors">
            <Pencil className="h-4 w-4" />
          </button>
        }
      />

      {/* Delete */}
      <button
        disabled={pending}
        onClick={() => {
          if (!confirm("ลบเงื่อนไขนี้?")) return;
          startTransition(() => void deleteAlertAction(alert.id));
        }}
        className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
