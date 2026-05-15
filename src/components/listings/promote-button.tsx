"use client";

import { useState } from "react";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromoteModal } from "./promote-modal";

interface PromoteButtonProps {
  listingId: string;
  listingTitle: string;
  walletBalance: number;
}

export function PromoteButton({ listingId, listingTitle, walletBalance }: PromoteButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-8 px-2.5 text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-400"
        onClick={() => setOpen(true)}
        title="โปรโมทประกาศ"
      >
        <Rocket className="h-3.5 w-3.5 mr-1" />
        <span className="text-xs">โปรโมท</span>
      </Button>

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
