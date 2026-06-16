"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star, Megaphone, X, CheckCircle2, ExternalLink, Upload, Download } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { generateReference } from "@/lib/payment-packages";

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
const ADMIN_LINE_URL = "https://line.me/R/ti/p/~salebiz";
const ADMIN_LINE_ID = "salebiz";

type Step = "select" | "payment" | "submitted";

export function PromoteModal({ listingId, listingTitle, type, onClose }: PromoteModalProps) {
  const router = useRouter();
  const group = PACKAGE_UI[type];
  const isFacebook = type === "facebook";

  const [packages, setPackages] = useState<DbPackage[]>([]);
  const [pkgLoading, setPkgLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [reference, setReference] = useState<string | null>(null);
  const [amountBaht, setAmountBaht] = useState<number | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSlipFile(file);
    setSlipPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleConfirmPackage() {
    if (!selectedId || !selectedPkg) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/boost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedId }),
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
            <div>
              <h2 className="text-base font-bold text-neutral-900">โปรโมทประกาศ</h2>
              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{listingTitle}</p>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 p-1"><X className="h-5 w-5" /></button>
          </div>

          {/* Step 1: Select package */}
          {step === "select" && (
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
                        <button key={pkg.id} onClick={() => { setSelectedId(pkg.id); setError(null); }}
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
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-2.5">
                  <p className="text-sm text-indigo-800 leading-relaxed">
                    ท่านจะเห็นโฆษณาประกาศนี้บน Facebook ภายใน <span className="font-semibold">1-2 วัน</span> ดูได้ที่เพจ{" "}
                    <a href={FACEBOOK_PAGE} target="_blank" rel="noopener noreferrer"
                      className="font-semibold text-[#1877F2] underline underline-offset-2 inline-flex items-center gap-0.5">
                      เซ้งร้าน.com
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                  <div className="flex items-center gap-2 pt-1 border-t border-indigo-200">
                    <span className="text-xs text-indigo-700">ติดต่อ Admin:</span>
                    <a href={ADMIN_LINE_URL} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#06C755] px-3 py-1 text-xs font-semibold text-white hover:bg-[#05a847] transition-colors">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.630 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                      add Line: {ADMIN_LINE_ID}
                    </a>
                  </div>
                </div>
              )}

              {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={onClose}>ยกเลิก</Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40"
                  disabled={!selectedId || loading || pkgLoading}
                  onClick={handleConfirmPackage}
                >
                  {loading ? "กำลังดำเนินการ..." : selectedPkg ? `กดสั่งซื้อเลย ${selectedPkg.price_thb.toLocaleString("th-TH")} บาท` : "เลือกแพ็กเกจ"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Payment — QR + bank info + slip upload */}
          {step === "payment" && reference && amountBaht !== null && (
            <div className="p-5 space-y-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm font-semibold text-neutral-800">สแกน QR หรือโอนเงินตามข้อมูลด้านล่าง</p>
                <a href={ADMIN_LINE_URL} target="_blank" rel="noopener noreferrer"
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
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
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
            <div className="flex flex-col items-center py-8 px-6 text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <p className="font-bold text-neutral-900 text-lg">รอการยืนยัน</p>
                <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                  ทีมงานจะตรวจสอบสลิปและเปิดใช้งาน<br />
                  ระบบจะดำเนินการให้ภายใน <span className="font-semibold">24 ชั่วโมง</span>
                </p>
              </div>
              {isFacebook && (
                <>
                  <a href={FACEBOOK_PAGE} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl bg-[#1877F2] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#166FE5] transition-colors">
                    <ExternalLink className="h-4 w-4" />ดูเพจ Facebook ของเรา
                  </a>
                  <div className="rounded-lg bg-neutral-50 border px-4 py-3 text-sm text-neutral-600 w-full text-left">
                    <p className="font-medium mb-1">มีข้อสงสัย? ติดต่อ admin</p>
                    <a href={ADMIN_LINE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#06C755] underline underline-offset-2">LINE: {ADMIN_LINE_ID}</a>
                  </div>
                </>
              )}
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { onClose(); router.refresh(); }}>ปิด</Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
