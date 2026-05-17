"use client";

import { useState } from "react";
import { Star, Megaphone } from "lucide-react";
import { PromoteModal } from "./promote-modal";

interface PromoteButtonsProps {
  listingId: string;
  listingTitle: string;
}

const BTNS = [
  {
    label: "Premium หน้าแรก",
    sublabel: "300+ บาท",
    icon: <Star className="h-3.5 w-3.5" />,
    color: "text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-400",
  },
  {
    label: "ยิงโฆษณา Facebook",
    sublabel: "1,500 บาท",
    icon: <Megaphone className="h-3.5 w-3.5" />,
    color: "text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400",
  },
];

export function PromoteButtons({ listingId, listingTitle }: PromoteButtonsProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex gap-1.5 flex-wrap mt-2">
        {BTNS.map((btn) => (
          <button
            key={btn.label}
            onClick={() => setOpen(true)}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${btn.color}`}
          >
            {btn.icon}
            <span>{btn.label}</span>
            <span className="opacity-60">· {btn.sublabel}</span>
          </button>
        ))}
      </div>

      {open && (
        <PromoteModal
          listingId={listingId}
          listingTitle={listingTitle}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
