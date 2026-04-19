"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteListingAction } from "@/lib/actions/listings";

export function DeleteListingButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteListingAction(listingId);
      setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 px-2 text-red-500 hover:text-red-600">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบประกาศนี้?</AlertDialogTitle>
          <AlertDialogDescription>
            การลบประกาศไม่สามารถยกเลิกได้ รูปภาพทั้งหมดจะถูกลบออกด้วย
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {isPending ? "กำลังลบ..." : "ลบประกาศ"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
