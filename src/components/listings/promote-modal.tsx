"use client";

import { useState, useEffect } from "react";
import { Star, Megaphone, X, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromoteModalProps {
  listingId: string;
  listingTitle: string;
  type: "premium" | "facebook";
  onClose: () => void;
}

type DbPackage = {
  id: number;
  name_th: string;
  price_thb: number;
  duration_days: number;
  package_type: string;
  reach_text: string | null;
};

const PACKAGE_UI = {
  premium: {
    icon: <Star className="h-5 w-5" />,
    color: "text-orange-600",
    selectedBorder: "border-orange-500",
    selectedBg: "bg-orange-50",
    label: "ประกาศ Premium หน้าแรก",
    desc: "ติดป้าย Premium โดดเด่น อยู่ใน section แนะนำบนหน้าแรก",
  },
  facebook: {
    icon: <Megaphone className="h-5 w-5" />,
    color: "text-indigo-600",
    selectedBorder: "border-indigo-500",
    selectedBg: "bg-indigo-50",
    label: "ยิงโฆษณา Facebook บนเพจ",
    desc: "ยิงโฆษณาบนเพจ facebook.com/selloutthailand",
  },
};

const FACEBOOK_PAGE = "https://www.facebook.com/selloutthailand/";
const ADMIN_LINE_URL = "https://line.me/R/ti/p/@salebiz";
const ADMIN_LINE_ID = "@salebiz";

const PROMOTE_LABEL: Record<string, string> = {
  premium: "โปรโมท Premium หน้าแรก",
  facebook: "โฆษณา Facebook",
};

export function PromoteModal({ listingTitle, type, onClose }: PromoteModalProps) {
  const group = PACKAGE_UI[type];
  const isFacebook = type === "facebook";

  const [packages, setPackages] = useState<DbPackage[]>([]);
  const [pkgLoading, setPkgLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/boost-packages?type=${type}`)
      .then((r) => r.json())
      .then((data: DbPackage[]) => {
        setPackages(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .finally(() => setPkgLoading(false));
  }, [type]);

  const selectedPkg = packages.find((p) => p.id === selectedId) ?? null;

  const orderMessage = selectedPkg
    ? `สวัสดีครับ ต้องการ${PROMOTE_LABEL[type]}\nประกาศ: ${listingTitle}\nแพ็กเกจ: ${selectedPkg.duration_days} วัน (${selectedPkg.price_thb.toLocaleString("th-TH")} บาท)`
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
            <div>
              <h2 className="text-base font-bold text-neutral-900">โปรโมทประกาศ</h2>
              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{listingTitle}</p>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 p-1"><X className="h-5 w-5" /></button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <div className={`flex items-center gap-2 mb-1.5 ${group.color}`}>
                {group.icon}
                <span className="text-sm font-semibold">{group.label}</span>
              </div>
              <p className="text-xs text-neutral-500 mb-3">{group.desc}</p>

              {pkgLoading ? (
                <div className="flex gap-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex-1 rounded-xl border-2 border-neutral-100 py-3 px-3 animate-pulse bg-neutral-50 h-20" />
                  ))}
                </div>
              ) : packages.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-4">ยังไม่มีแพ็กเกจที่เปิดใช้งาน</p>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {packages.map((pkg) => {
                    const isSelected = selectedId === pkg.id;
                    return (
                      <button key={pkg.id} onClick={() => setSelectedId(pkg.id)}
                        className={`flex-1 min-w-[120px] rounded-xl border-2 py-3 px-3 text-center transition-all ${
                          isSelected ? `${group.selectedBorder} ${group.selectedBg}` : "border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        <p className="text-xs font-medium text-neutral-700">{pkg.duration_days} วัน</p>
                        {pkg.reach_text && (
                          <p className="text-[10px] text-indigo-500 mt-0.5">{pkg.reach_text}</p>
                        )}
                        <p className={`text-sm font-bold mt-1 ${group.color}`}>{pkg.price_thb.toLocaleString("th-TH")} บาท</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Facebook info box */}
            {isFacebook && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-800 leading-relaxed">
                ท่านจะเห็นโฆษณาประกาศนี้บน Facebook ภายใน <span className="font-semibold">1-2 วัน</span> ดูได้ที่เพจ{" "}
                <a href={FACEBOOK_PAGE} target="_blank" rel="noopener noreferrer"
                  className="font-semibold text-[#1877F2] underline underline-offset-2 inline-flex items-center gap-0.5">
                  เซ้งร้าน.com <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {selectedPkg && (
              <div className="rounded-xl border border-[#06C755]/30 bg-[#06C755]/5 p-3 space-y-2">
                <p className="text-xs text-neutral-700 leading-relaxed">
                  สั่งซื้อผ่าน <span className="font-semibold">LINE OA: {ADMIN_LINE_ID}</span><br />
                  แอดมินจะเปิดใช้งานให้ภายใน 24 ชั่วโมง
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

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose}>ยกเลิก</Button>
              <Button
                className="flex-1 bg-[#06C755] hover:bg-[#05a847] text-white disabled:opacity-40 gap-1.5"
                disabled={!selectedId || pkgLoading}
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
