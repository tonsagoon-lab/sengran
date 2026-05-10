"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-white shadow-lg px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 text-sm text-neutral-600 leading-relaxed">
          เราใช้คุกกี้เพื่อพัฒนาประสบการณ์การใช้งานเว็บไซต์ ตามนโยบาย{" "}
          <Link href="/privacy" className="text-orange-500 hover:underline font-medium">
            ความเป็นส่วนตัว
          </Link>{" "}
          ของเรา
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 rounded-xl text-sm text-neutral-500 hover:bg-neutral-100 transition-colors"
          >
            ปฏิเสธ
          </button>
          <button
            onClick={accept}
            className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
          >
            ยอมรับ
          </button>
          <button
            onClick={decline}
            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors sm:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
