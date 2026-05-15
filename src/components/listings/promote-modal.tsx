"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Rocket, Star, Megaphone, X, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromoteModalProps {
  listingId: string;
  listingTitle: string;
  walletBalance: number;
  onClose: () => void;
}

const PACKAGES = [
  {
    key: "homepage",
    icon: <Rocket className="h-5 w-5" />,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    selectedBorder: "border-blue-500",
    selectedBg: "bg-blue-50",
    label: "ดันโพสหน้าแรก",
    desc: "ขึ้นด้านบนสุดในหน้าค้นหาและหน้าแรก 7 วัน",
    options: [{ key: "homepage", label: "7 วัน", coins: 20 }],
  },
  {
    key: "premium",
    icon: <Star className="h-5 w-5" />,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    selectedBorder: "border-orange-500",
    selectedBg: "bg-orange-50",
    label: "ประกาศ Premium",
    desc: "ติดป้าย Premium โดดเด่นบนหน้าเว็บ",
    options: [
      { key: "premium_10", label: "10 วัน", coins: 300 },
      { key: "premium_20", label: "20 วัน", coins: 500 },
    ],
  },
  {
    key: "facebook",
    icon: <Megaphone className="h-5 w-5" />,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    selectedBorder: "border-indigo-500",
    selectedBg: "bg-indigo-50",
    label: "โฆษณา Facebook",
    desc: "ยิงโฆษณาบนเพจ Facebook ของเรา",
    options: [
      { key: "facebook_7", label: "7 วัน", coins: 1500 },
      { key: "facebook_15", label: "15 วัน", coins: 3000 },
    ],
  },
];

export function PromoteModal({ listingId, listingTitle, walletBalance, onClose }: PromoteModalProps) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedOption = PACKAGES.flatMap((p) => p.options).find((o) => o.key === selectedKey);
  const canAfford = selectedOption ? walletBalance >= selectedOption.coins : false;

  async function handleConfirm() {
    if (!selectedKey || !selectedOption) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/boost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageKey: selectedKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "เกิดข้อผิดพลาด");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        onClose();
        router.refresh();
      }, 2000);
    } catch {
      setError("เกิดข้อผิดพลาด");
      setLoading(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/50"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[101] flex items-center justify-center px-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
            <div>
              <h2 className="text-base font-bold text-neutral-900">โปรโมทประกาศ</h2>
              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{listingTitle}</p>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          {success ? (
            <div className="flex flex-col items-center py-10 px-5 text-center gap-3">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <p className="font-bold text-neutral-900">สั่งซื้อสำเร็จ!</p>
              <p className="text-sm text-neutral-500">ระบบกำลังอัปเดตประกาศของคุณ</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {/* Coin balance */}
              <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2">
                <Coins className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-orange-700">
                  ยอด coin คงเหลือ:{" "}
                  <span className="font-bold">{walletBalance.toLocaleString("th-TH")}</span>
                </span>
              </div>

              {/* Package groups */}
              {PACKAGES.map((group) => (
                <div key={group.key}>
                  <div className={`flex items-center gap-2 mb-2 ${group.color}`}>
                    {group.icon}
                    <span className="text-sm font-semibold">{group.label}</span>
                  </div>
                  <p className="text-xs text-neutral-500 mb-2">{group.desc}</p>
                  <div className="flex gap-2">
                    {group.options.map((opt) => {
                      const isSelected = selectedKey === opt.key;
                      const afford = walletBalance >= opt.coins;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => setSelectedKey(opt.key)}
                          disabled={!afford}
                          className={`flex-1 rounded-xl border-2 py-3 px-3 text-center transition-all ${
                            isSelected
                              ? `${group.selectedBorder} ${group.selectedBg}`
                              : afford
                              ? `border-neutral-200 hover:border-neutral-300`
                              : "border-neutral-100 opacity-40 cursor-not-allowed"
                          }`}
                        >
                          <p className="text-xs text-neutral-500">{opt.label}</p>
                          <p className={`text-sm font-bold mt-0.5 ${group.color}`}>
                            {opt.coins.toLocaleString("th-TH")} coins
                          </p>
                          {!afford && (
                            <p className="text-[10px] text-red-400 mt-0.5">coin ไม่พอ</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  ยกเลิก
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={!selectedKey || !canAfford || loading}
                  onClick={handleConfirm}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      กำลังดำเนินการ...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      ยืนยัน
                      {selectedOption && (
                        <span className="text-white/80">
                          ({selectedOption.coins.toLocaleString("th-TH")} coins)
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>

              {/* Top up link */}
              <p className="text-center text-xs text-neutral-400">
                coin ไม่พอ?{" "}
                <a href="/wallet/topup" className="text-orange-600 underline underline-offset-2">
                  เติม coin
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
