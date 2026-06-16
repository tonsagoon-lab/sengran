"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { FileText, X, CheckCircle2, Upload, Download } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { QUOTA_PACKAGES, type QuotaPackageKey } from "@/lib/payment-packages";

interface QuotaUpgradeModalProps {
  currentQuota: number;
  onClose: () => void;
}

const PACKAGES_LIST = Object.entries(QUOTA_PACKAGES).map(([key, pkg]) => ({ key: key as QuotaPackageKey, ...pkg }));

type Step = "select" | "payment" | "submitted";

export function QuotaUpgradeModal({ currentQuota, onClose }: QuotaUpgradeModalProps) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState<QuotaPackageKey | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [reference, setReference] = useState<string | null>(null);
  const [amountBaht, setAmountBaht] = useState<number | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPkg = selectedKey ? QUOTA_PACKAGES[selectedKey] : null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSlipFile(file);
    if (file) {
      setSlipPreview(URL.createObjectURL(file));
    } else {
      setSlipPreview(null);
    }
  }

  async function handleConfirmPackage() {
    if (!selectedKey || !selectedPkg) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/profile/quota-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageKey: selectedKey }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); setLoading(false); return; }
      setReference(data.reference);
      setAmountBaht(data.amount_baht);
      setStep("payment");
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitSlip() {
    if (!slipFile || !reference) return;
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("slip", slipFile);
      const res = await fetch(`/api/orders/${reference}/slip`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); setLoading(false); return; }
      setStep("submitted");
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50" onClick={step === "select" ? onClose : undefined} />
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

          {/* Step 1: Select package */}
          {step === "select" && (
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

              {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>ยกเลิก</Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40"
                  disabled={!selectedKey || loading}
                  onClick={handleConfirmPackage}
                >
                  {loading ? "กำลังดำเนินการ..." : selectedKey ? `กดสั่งซื้อเลย ${selectedPkg!.baht.toLocaleString("th-TH")} บาท` : "เลือกแพ็กเกจ"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === "payment" && reference && amountBaht !== null && (
            <div className="p-5 space-y-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm font-semibold text-neutral-800">สแกน QR หรือโอนเงินตามข้อมูลด้านล่าง</p>
                <a href="https://line.me/R/ti/p/~salebiz" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#06C755] hover:bg-[#05a847] px-4 py-1.5 text-sm font-semibold text-white transition-colors">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M19.952 12.477c0-4.185-4.194-7.588-9.352-7.588S1.248 8.292 1.248 12.477c0 3.752 3.327 6.893 7.822 7.49.305.066.72.2.825.46.094.236.062.606.03.845l-.133.8c-.041.236-.188.923.809.503 1-.42 5.374-3.165 7.33-5.418 1.351-1.482 2.021-2.987 2.021-4.68z"/></svg>
                  หรือสั่งซื้อผ่าน Line = salebiz
                </a>
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-2xl border-2 border-neutral-200 bg-white p-3 shadow-sm">
                    <Image
                      src="/promptpay-qr.jpg"
                      alt="PromptPay QR"
                      width={200}
                      height={200}
                      unoptimized
                      className="rounded-lg"
                    />
                  </div>
                  <a
                    href="/promptpay-qr.jpg"
                    download="promptpay-qr.jpg"
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    ดาวน์โหลด QR
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">ธนาคาร</span>
                  <span className="font-semibold text-neutral-900">กสิกรไทย</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">เลขบัญชี</span>
                  <span className="font-semibold text-neutral-900 font-mono">497-2-52835-3</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">ชื่อบัญชี</span>
                  <span className="font-semibold text-neutral-900">นายต้นสกุล จอมดวง</span>
                </div>
                <div className="border-t border-neutral-200 pt-2 flex justify-between items-center">
                  <span className="text-neutral-600">ยอดชำระ</span>
                  <span className="text-lg font-bold text-orange-600">{amountBaht.toLocaleString("th-TH")} บาท</span>
                </div>
                <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
                  <span className="text-amber-700 text-xs">อ้างอิง (ระบุในหมายเหตุ)</span>
                  <span className="font-bold text-amber-800 font-mono text-sm">{reference}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-700">อัปโหลดสลิปการโอน</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {slipPreview ? (
                  <div className="relative rounded-xl overflow-hidden border-2 border-orange-300">
                    <Image src={slipPreview} alt="slip preview" width={400} height={300} unoptimized className="w-full object-cover max-h-48" />
                    <button
                      onClick={() => { setSlipFile(null); setSlipPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="absolute top-2 right-2 rounded-full bg-white/80 p-1 text-neutral-600 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 py-6 text-neutral-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
                  >
                    <Upload className="h-8 w-8" />
                    <span className="text-sm font-medium">แตะเพื่อเลือกรูปสลิป</span>
                    <span className="text-xs text-neutral-400">รองรับ JPG, PNG</span>
                  </button>
                )}
              </div>

              {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={onClose}>ยกเลิก</Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={!slipFile || loading}
                  onClick={handleSubmitSlip}
                >
                  {loading ? "กำลังส่ง..." : "ส่งสลิป"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Submitted */}
          {step === "submitted" && (
            <div className="flex flex-col items-center py-10 px-5 text-center gap-3">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <p className="font-bold text-neutral-900">รอการยืนยัน</p>
              <p className="text-sm text-neutral-500 leading-relaxed">
                ทีมงานจะตรวจสอบสลิปและเพิ่มจำนวนประกาศให้<br />
                ระบบจะดำเนินการให้ภายใน <span className="font-semibold">24 ชั่วโมง</span>
              </p>
              <Button className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { onClose(); router.refresh(); }}>ปิด</Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
