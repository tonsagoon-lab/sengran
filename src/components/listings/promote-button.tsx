"use client";

import { useState } from "react";
import { Rocket, Star, Megaphone } from "lucide-react";
import { PromoteModal } from "./promote-modal";

interface PromoteButtonsProps {
  listingId: string;
  listingTitle: string;
  walletBalance: number;
}

const BTNS = [
  {
    label: "ดันหน้าแรก",
    sublabel: "20 coins",
    icon: <Rocket className="h-3.5 w-3.5" />,
    color: "text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-400",
  },
  {
    label: "Premium",
    sublabel: "300+ coins",
    icon: <Star className="h-3.5 w-3.5" />,
    color: "text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-400",
  },
  {
    label: "Facebook",
    sublabel: "1,500 coins",
    icon: <Megaphone className="h-3.5 w-3.5" />,
    color: "text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400",
  },
];

export function PromoteButtons({ listingId, listingTitle, walletBalance }: PromoteButtonsProps) {
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
          walletBalance={walletBalance}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
