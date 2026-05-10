import Link from "next/link";
import { TopMenuBar } from "@/components/top-menu-bar";

export default function NotFound() {
  return (
    <>
      <TopMenuBar />
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center space-y-6">
        <p className="text-7xl font-bold text-orange-400">404</p>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-neutral-900">ไม่พบหน้าที่ต้องการ</h1>
          <p className="text-neutral-500 text-sm">
            ประกาศอาจถูกลบ ย้าย หรือ URL ไม่ถูกต้อง
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            กลับหน้าแรก
          </Link>
          <Link
            href="/listings"
            className="rounded-xl border px-6 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            ดูประกาศทั้งหมด
          </Link>
        </div>
      </div>
    </>
  );
}
