"use client";

import { useTransition } from "react";
import { EyeOff, CheckCircle, Eye, Loader2 } from "lucide-react";
import { updateListingStatusAction } from "@/lib/actions/listings";

interface Props {
  listingId: string;
  currentStatus: string;
}

export function ListingStatusButtons({ listingId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();

  function update(status: "published" | "hidden" | "sold") {
    startTransition(async () => {
      await updateListingStatusAction(listingId, status);
    });
  }

  if (isPending) {
    return <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />;
  }

  if (currentStatus === "published") {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => update("hidden")}
          className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50 transition-colors whitespace-nowrap"
        >
          <EyeOff className="h-3.5 w-3.5" />
          ซ่อนโพส
        </button>
        <button
          onClick={() => update("sold")}
          className="flex items-center gap-1.5 rounded-lg border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50 transition-colors whitespace-nowrap"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          ขายแล้ว
        </button>
      </div>
    );
  }

  if (currentStatus === "hidden" || currentStatus === "sold") {
    return (
      <button
        onClick={() => update("published")}
        className="flex items-center gap-1.5 rounded-lg border border-orange-200 px-2 py-1 text-xs text-orange-600 hover:bg-orange-50 transition-colors whitespace-nowrap"
      >
        <Eye className="h-3.5 w-3.5" />
        เผยแพร่
      </button>
    );
  }

  return null;
}
