"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ListingTypeChooser({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [chosen, setChosen] = useState(false);

  if (chosen) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2 text-center">ลงประกาศใหม่</h1>
      <p className="text-neutral-500 text-sm mb-8 text-center">เลือกประเภทประกาศที่ต้องการลง</p>

      <div className="grid grid-cols-1 gap-4 w-full max-w-sm sm:grid-cols-2 sm:max-w-xl">
        {/* เซ้งร้าน */}
        <button
          onClick={() => setChosen(true)}
          className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-neutral-200 bg-white p-8 text-center shadow-sm hover:border-orange-400 hover:shadow-md transition-all"
        >
          <span className="text-5xl">🏪</span>
          <div>
            <p className="text-lg font-bold text-neutral-900 group-hover:text-orange-600">เซ้งร้าน</p>
            <p className="text-xs text-neutral-500 mt-1">ลงประกาศเซ้ง / ให้เช่าพื้นที่ร้านค้า</p>
          </div>
        </button>

        {/* ขายอุปกรณ์ */}
        <button
          onClick={() => router.push("/equipment/new")}
          className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-neutral-200 bg-white p-8 text-center shadow-sm hover:border-orange-400 hover:shadow-md transition-all"
        >
          <span className="text-5xl">🔧</span>
          <div>
            <p className="text-lg font-bold text-neutral-900 group-hover:text-orange-600">ขายอุปกรณ์</p>
            <p className="text-xs text-neutral-500 mt-1">ลงขายอุปกรณ์ร้านค้า มือหนึ่ง มือสอง</p>
          </div>
        </button>
      </div>
    </div>
  );
}
