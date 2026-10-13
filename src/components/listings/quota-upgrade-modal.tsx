"use client";

import { useState } from "react";
import { FileText, X, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUOTA_PACKAGES, type QuotaPackageKey } from "@/lib/payment-packages";

interface QuotaUpgradeModalProps {
  currentQuota: number;
  onClose: () => void;
}

const PACKAGES_LIST = Object.entries(QUOTA_PACKAGES).map(([key, pkg]) => ({ key: key as QuotaPackageKey, ...pkg }));
const ADMIN_LINE_URL = "https://line.me/R/ti/p/@salebiz";
const ADMIN_LINE_ID = "@salebiz";

export function QuotaUpgradeModal({ currentQuota, onClose }: QuotaUpgradeModalProps) {
  const [selectedKey, setSelectedKey] = useState<QuotaPackageKey | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedPkg = selectedKey ? QUOTA_PACKAGES[selectedKey] : null;

  const orderMessage = selectedPkg
    ? `สวัสดีครับ ต้องการเพิ่มจำนวนประกาศ\nแพ็กเกจ: ${selectedPkg.label}\nราคา: ${selectedPkg.baht.toLocaleString("th-TH")} บาท`
    : "";

  async function handleCopy() {
    if (!orderMessage) return;
    try {
      await navigator.clipboard.writeText(orderMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (http context, etc.) — fail silently
    }
  }

  function handleOrderViaLine() {
    if (!selectedPkg) return;
    void handleCopy();
    window.open(ADMIN_LINE_URL, "_blank", "noopener,noreferrer");
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center px-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
            <div>
              <h2 className="text-base font-bold text-neutral-900">เพิ่มจำนวนประกาศ</h2>
              <p className="text-xs text-neutral-500 mt-0.5">ปัจจุบันมีสิทธิ์ {currentQuota} ประกาศ/ปี</p>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 p-1"><X className="h-5 w-5" /></button>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-2">
              {PACKAGES_LIST.map(({ key, label, baht }) => {
                const isSelected = selectedKey === key;
                return (
                  <button key={key} onClick={() => setSelectedKey(key)}
                    className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all ${
                      isSelected ? "border-orange-500 bg-orange-50" : "border-neutral-200 hover:border-orange-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isSelected ? "bg-orange-500" : "bg-neutral-100"}`}>
                        <FileText className={`h-4 w-4 ${isSelected ? "text-white" : "text-neutral-500"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{label}</p>
                        <p className="text-xs text-neutral-500">ราคาต่อปี</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-orange-600">{baht.toLocaleString("th-TH")} บาท</p>
                  </button>
                );
              })}
            </div>

            {selectedPkg && (
              <div className="rounded-xl border border-[#06C755]/30 bg-[#06C755]/5 p-3 space-y-2">
                <p className="text-xs text-neutral-700 leading-relaxed">
                  สั่งซื้อผ่าน <span className="font-semibold">LINE OA: {ADMIN_LINE_ID}</span><br />
                  แอดมินจะเพิ่มสิทธิ์ให้ภายใน 24 ชั่วโมง
                </p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-700 transition-colors"
                >
                  {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  {copied ? "คัดลอกข้อความแล้ว" : "คัดลอกข้อความแจ้งแอดมิน"}
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>ยกเลิก</Button>
              <Button
                className="flex-1 bg-[#06C755] hover:bg-[#05a847] text-white disabled:opacity-40 gap-1.5"
                disabled={!selectedKey}
                onClick={handleOrderViaLine}
              >
                <ExternalLink className="h-4 w-4" />
                สั่งซื้อผ่าน LINE
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
