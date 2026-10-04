import { Sparkles, CheckCircle2 } from "lucide-react";
import { getLiveActivityStats } from "@/lib/db/listings";

export async function LiveActivityStrip() {
  const { newToday, viewingNow, soldThisMonth } = await getLiveActivityStats();

  if (newToday === 0 && viewingNow === 0 && soldThisMonth === 0) return null;

  const fmt = new Intl.NumberFormat("th-TH");

  return (
    <div className="border-y bg-gradient-to-r from-orange-50 via-white to-orange-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-4 py-2.5 text-xs md:text-sm md:gap-x-8 md:py-3">
        <div className="flex items-center gap-1.5 font-medium text-neutral-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
          </span>
          <span>
            กำลังดูอยู่ <span className="font-bold text-green-700">{fmt.format(viewingNow)}</span> คน
          </span>
        </div>

        <span className="hidden h-3 w-px bg-neutral-300 md:inline-block" />

        <div className="flex items-center gap-1.5 font-medium text-neutral-700">
          <Sparkles className="h-3.5 w-3.5 text-orange-500" />
          <span>
            ประกาศใหม่วันนี้ <span className="font-bold text-orange-600">{fmt.format(newToday)}</span>
          </span>
        </div>

        <span className="hidden h-3 w-px bg-neutral-300 md:inline-block" />

        <div className="flex items-center gap-1.5 font-medium text-neutral-700">
          <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
          <span>
            เซ้งสำเร็จเดือนนี้ <span className="font-bold text-blue-700">{fmt.format(soldThisMonth)}</span> ร้าน
          </span>
        </div>
      </div>
    </div>
  );
}
