"use client";

import { useEffect, useState } from "react";
import { X, Share, Plus, Smartphone } from "lucide-react";

const DISMISS_KEY = "pwa_install_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    if (isIOS()) {
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
    setShowIOSInstructions(false);
  }

  async function install() {
    if (isIOS()) {
      setShowIOSInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }

  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 sm:p-6 pointer-events-none">
        <div className="mx-auto max-w-md rounded-2xl border bg-white shadow-lg px-4 py-3 flex items-center gap-3 pointer-events-auto">
          <div className="shrink-0 h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-900">ติดตั้งเซ้งร้าน</p>
            <p className="text-xs text-neutral-500">เข้าใช้งานได้เร็วขึ้นจากหน้าจอโฮม</p>
          </div>
          <button
            onClick={install}
            className="shrink-0 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
          >
            ติดตั้ง
          </button>
          <button
            onClick={dismiss}
            className="shrink-0 p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">ติดตั้งบน iPhone</h3>
              <button
                onClick={dismiss}
                className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100"
                aria-label="ปิด"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ol className="space-y-3 text-sm text-neutral-700">
              <li className="flex items-start gap-3">
                <span className="shrink-0 h-6 w-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-semibold">
                  1
                </span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  แตะปุ่มแชร์
                  <Share className="h-4 w-4 text-blue-500" />
                  ที่แถบล่างของ Safari
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 h-6 w-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-semibold">
                  2
                </span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  เลื่อนลงแล้วเลือก
                  <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs">
                    <Plus className="h-3 w-3" />
                    เพิ่มไปยังหน้าจอโฮม
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 h-6 w-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-semibold">
                  3
                </span>
                <span>แตะ &ldquo;เพิ่ม&rdquo; ที่มุมขวาบน — เสร็จ!</span>
              </li>
            </ol>
            <button
              onClick={dismiss}
              className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium transition-colors"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </>
  );
}
