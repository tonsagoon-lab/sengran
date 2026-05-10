"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center space-y-6">
      <p className="text-7xl font-bold text-neutral-200">500</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-neutral-900">เกิดข้อผิดพลาด</h1>
        <p className="text-neutral-500 text-sm">ขออภัย ระบบขัดข้องชั่วคราว</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          ลองอีกครั้ง
        </button>
        <Link
          href="/"
          className="rounded-xl border px-6 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          กลับหน้าแรก
        </Link>
      </div>
    </div>
  );
}
