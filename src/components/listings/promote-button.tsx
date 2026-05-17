"use client";

import { useState } from "react";
import { Star, Megaphone } from "lucide-react";
import { PromoteModal } from "./promote-modal";

interface PromoteButtonsProps {
  listingId: string;
  listingTitle: string;
}

export function PromoteButtons({ listingId, listingTitle }: PromoteButtonsProps) {
  const [openType, setOpenType] = useState<"premium" | "facebook" | null>(null);

  return (
    <>
      <div className="flex gap-1.5 flex-wrap mt-2">
        <button
          onClick={() => setOpenType("premium")}
          className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-400"
        >
          <Star className="h-3.5 w-3.5" />
          <span>Premium หน้าแรก</span>
          <span className="opacity-60">· 300+ บาท</span>
        </button>

        <button
          onClick={() => setOpenType("facebook")}
          className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400"
        >
          <Megaphone className="h-3.5 w-3.5" />
          <span>ยิงโฆษณา Facebook</span>
          <span className="opacity-60">· 1,500+ บาท</span>
        </button>
      </div>

      {openType && (
        <PromoteModal
          listingId={listingId}
          listingTitle={listingTitle}
          type={openType}
          onClose={() => setOpenType(null)}
        />
      )}
    </>
  );
}
