"use client";

import { useState, useEffect } from "react";
import { X, ShieldAlert, ShieldCheck } from "lucide-react";

const DISMISS_KEY = "equipment_safety_dismissed";

export function SafetyBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="mx-auto max-w-6xl flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm text-yellow-800">
          <span className="font-semibold">คำเตือน:</span>{" "}
          เซ้งร้านดอทคอมเป็นเพียงพื้นที่ประกาศซื้อขาย{" "}
          ไม่มีส่วนเกี่ยวข้องกับการซื้อขาย การชำระเงิน หรือการส่งมอบสินค้าใดๆ ทั้งสิ้น{" "}
          <span className="font-medium">โปรดนัดพบและตรวจสอบสินค้าก่อนโอนเงินทุกครั้ง</span>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 text-yellow-600 hover:text-yellow-800 transition-colors"
          aria-label="ปิด"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function SafetyTips() {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
        <h3 className="font-semibold text-green-800 text-sm">เคล็ดลับซื้อขายปลอดภัย</h3>
      </div>
      <ol className="space-y-2 text-sm text-green-800">
        <li className="flex gap-2">
          <span className="font-bold shrink-0">1.</span>
          <span>นัดพบและตรวจสอบสินค้าจริงก่อนโอนเงินทุกครั้ง</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold shrink-0">2.</span>
          <span>อย่าโอนเงินก่อนเห็นสินค้า ระวังทุกครั้ง</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold shrink-0">3.</span>
          <span>ขอดูบัตรประชาชนผู้ขาย และถ่ายรูปสินค้าพร้อมบัตรก่อนโอน</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold shrink-0">4.</span>
          <span>ระวังราคาถูกผิดปกติ หรือผู้ขายเร่งรัดให้โอนเงินเร็ว</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold shrink-0">5.</span>
          <span>หากพบพฤติกรรมน่าสงสัย กดปุ่ม &ldquo;รายงาน&rdquo; ด้านบนได้ทันที</span>
        </li>
      </ol>
      <p className="text-xs text-green-700 pt-1 border-t border-green-200">
        เซ้งร้านดอทคอมเป็นเพียงพื้นที่ประกาศซื้อขาย ไม่มีส่วนเกี่ยวข้องกับการซื้อขาย
        การชำระเงิน หรือการส่งมอบสินค้าใดๆ ทั้งสิ้น
        ผู้ซื้อและผู้ขายรับผิดชอบต่อธุรกรรมของตนเอง
      </p>
    </div>
  );
}
