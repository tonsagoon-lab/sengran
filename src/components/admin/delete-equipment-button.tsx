"use client";

import { useTransition } from "react";
import { adminDeleteEquipmentListingAction } from "@/lib/actions/equipment";

export function DeleteEquipmentButton({ listingId, title }: { listingId: string; title: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`ลบ "${title}" ถาวรเลยไหม?`)) return;
    startTransition(async () => {
      await adminDeleteEquipmentListingAction(listingId);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {pending ? "..." : "ลบ"}
    </button>
  );
}
