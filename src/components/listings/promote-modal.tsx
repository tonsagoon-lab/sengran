"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Star, Megaphone, X, CheckCircle2, ChevronRight, ExternalLink, CreditCard, QrCode, Clock } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PromoteModalProps {
  listingId: string;
  listingTitle: string;
  type: "premium" | "facebook";
  onClose: () => void;
}

const PACKAGES = {
  premium: {
    icon: <Star className="h-5 w-5" />,
    color: "text-orange-600",
    selectedBorder: "border-orange-500",
    selectedBg: "bg-orange-50",
    label: "ประกาศ Premium หน้าแรก",
    desc: "ติดป้าย Premium โดดเด่น อยู่ใน section แนะนำบนหน้าแรก",
    options: [
      { key: "premium_15", label: "15 วัน", baht: 300 },
      { key: "premium_30", label: "30 วัน", baht: 500 },
    ],
  },
  facebook: {
    icon: <Megaphone className="h-5 w-5" />,
    color: "text-indigo-600",
    selectedBorder: "border-indigo-500",
    selectedBg: "bg-indigo-50",
    label: "ยิงโฆษณา Facebook บนเพจ",
    desc: "ยิงโฆษณาบนเพจ facebook.com/selloutthailand",
    options: [
      { key: "facebook_10", label: "10 วัน", baht: 1500 },
      { key: "facebook_20", label: "20 วัน", baht: 2990 },
    ],
  },
};

const FACEBOOK_PAGE = "https://www.facebook.com/selloutthailand/";
const ADMIN_LINE_URL = "https://line.me/R/ti/p/~salebiz";
const ADMIN_LINE_ID = "salesbiz";
const OMISE_PUBLIC_KEY = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY || "pkey_test_67orguspr2347ve5biw";
const QR_EXPIRE_MIN = 15;

declare global {
  interface Window { Omise: { setPublicKey: (k: string) => void; createToken: (...a: unknown[]) => void }; }
}

interface CardInfo { number: string; name: string; expiry: string; cvv: string; }
interface QrData { chargeId: string; qrImageUrl: string | null; }

export function PromoteModal({ listingId, listingTitle, type, onClose }: PromoteModalProps) {
  const router = useRouter();
  const group = PACKAGES[type];
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState("");
  const [payMethod, setPayMethod] = useState<"promptpay" | "card">("promptpay");
  const [cardInfo, setCardInfo] = useState<CardInfo>({ number: "", name: "", expiry: "", cvv: "" });
  const [omiseReady, setOmiseReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successType, setSuccessType] = useState<string | null>(null);
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [qrMinLeft, setQrMinLeft] = useState(QR_EXPIRE_MIN);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;
    const s = document.createElement("script");
    s.src = "https://cdn.omise.co/omise.js";
    s.onload = () => { window.Omise?.setPublicKey(OMISE_PUBLIC_KEY); setOmiseReady(true); };
    document.head.appendChild(s);
  }, []);

  // Poll when QR shown
  useEffect(() => {
    if (!qrData || successType) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/omise/check-charge/${qrData.chargeId}`);
        const data = await res.json();
        if (data.status === "successful") {
          setSuccessType(type === "facebook" ? "facebook" : "other");
          if (type !== "facebook") setTimeout(() => { onClose(); router.refresh(); }, 2500);
        } else if (data.status === "failed") {
          setError("QR หมดอายุหรือการชำระเงินล้มเหลว"); setQrData(null);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [qrData, successType, type, onClose, router]);

  // QR countdown
  useEffect(() => {
    if (!qrData || successType) return;
    const interval = setInterval(() => {
      setQrMinLeft((p) => { if (p <= 1) { setError("QR หมดอายุแล้ว"); setQrData(null); return 0; } return p - 1; });
    }, 60000);
    return () => clearInterval(interval);
  }, [qrData, successType]);

  const selectedOption = group.options.find((o) => o.key === selectedKey);
  const isFacebook = type === "facebook";
  const cardFilled = cardInfo.number.replace(/\s/g, "").length === 16 && cardInfo.name.trim() && cardInfo.expiry.length === 5 && cardInfo.cvv.length >= 3;
  const canSubmit = selectedKey && (payMethod === "promptpay" || cardFilled);

  function formatCardNumber(v: string) { return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim(); }
  function formatExpiry(v: string) { const d = v.replace(/\D/g, "").slice(0, 4); return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d; }

  function tokenizeCard(): Promise<string> {
    return new Promise((resolve, reject) => {
      const [em, ey] = cardInfo.expiry.split("/");
      window.Omise.createToken("card", {
        number: cardInfo.number.replace(/\s/g, ""),
        expiration_month: Number(em),
        expiration_year: Number("20" + ey),
        security_code: cardInfo.cvv,
        name: cardInfo.name,
      }, (status: number, res: { id?: string; message?: string }) => {
        if (status === 200 && res.id) resolve(res.id);
        else reject(new Error(res.message ?? "Card error"));
      });
    });
  }

  async function handleConfirm() {
    if (!selectedKey || !selectedOption) return;
    if (payMethod === "card" && !omiseReady) { setError("ระบบบัตรยังไม่พร้อม"); return; }
    setError(null);
    setLoading(true);
    try {
      let tokenId: string | undefined;
      if (payMethod === "card") tokenId = await tokenizeCard();

      const res = await fetch(`/api/listings/${listingId}/boost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageKey: selectedKey, contactInfo: contactInfo.trim(), paymentMethod: payMethod, tokenId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); setLoading(false); return; }

      if (payMethod === "promptpay") {
        setQrData({ chargeId: data.chargeId, qrImageUrl: data.qrImageUrl });
        setQrMinLeft(QR_EXPIRE_MIN);
      } else {
        setSuccessType(isFacebook ? "facebook" : "other");
        if (!isFacebook) setTimeout(() => { onClose(); router.refresh(); }, 2500);
      }
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50" onClick={(qrData || successType) ? undefined : onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center px-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto max-h-[90vh] overflow-y-auto">

          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
            <div>
              <h2 className="text-base font-bold text-neutral-900">โปรโมทประกาศ</h2>
              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{listingTitle}</p>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 p-1"><X className="h-5 w-5" /></button>
          </div>

          {/* QR Code view */}
          {qrData && !successType && (
            <div className="flex flex-col items-center p-6 gap-4 text-center">
              <div>
                <p className="font-semibold text-neutral-900">สแกน QR เพื่อชำระเงิน</p>
                <p className="text-xs text-neutral-500 mt-0.5">ใช้แอปธนาคารสแกน PromptPay</p>
              </div>
              <div className="rounded-2xl border-2 border-neutral-200 bg-white p-4 shadow-sm">
                {qrData.qrImageUrl ? (
                  <Image src={qrData.qrImageUrl} alt="PromptPay QR" width={200} height={200} unoptimized className="rounded-lg" />
                ) : (
                  <div className="h-[200px] w-[200px] flex items-center justify-center"><QrCode className="h-16 w-16 text-neutral-300" /></div>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Clock className="h-4 w-4 text-orange-400" />
                <span>QR หมดอายุใน <span className="font-semibold text-orange-600">{qrMinLeft} นาที</span></span>
              </div>
              <p className="text-sm font-semibold text-neutral-800">
                ยอดชำระ {selectedOption?.baht.toLocaleString("th-TH")} บาท
              </p>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                กำลังรอการชำระเงิน...
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button onClick={() => setQrData(null)} className="text-sm text-neutral-400 underline underline-offset-2">ยกเลิก / เปลี่ยนวิธีชำระ</button>
            </div>
          )}

          {/* Success: Facebook */}
          {successType === "facebook" && (
            <div className="flex flex-col items-center py-8 px-6 text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <p className="font-bold text-neutral-900 text-lg">สั่งซื้อสำเร็จ!</p>
                <p className="text-sm text-neutral-600 mt-2 leading-relaxed">โฆษณาของคุณจะขึ้นบน Facebook ภายใน <span className="font-semibold">1-2 วันทำการ</span></p>
              </div>
              <a href={FACEBOOK_PAGE} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-[#1877F2] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#166FE5] transition-colors">
                <ExternalLink className="h-4 w-4" />ดูเพจ Facebook ของเรา
              </a>
              <div className="rounded-lg bg-neutral-50 border px-4 py-3 text-sm text-neutral-600 w-full text-left">
                <p className="font-medium mb-1">มีข้อสงสัย? ติดต่อ admin</p>
                <a href={ADMIN_LINE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#06C755] underline underline-offset-2">LINE: {ADMIN_LINE_ID}</a>
              </div>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { onClose(); router.refresh(); }}>ปิด</Button>
            </div>
          )}

          {/* Success: other */}
          {successType === "other" && (
            <div className="flex flex-col items-center py-10 px-5 text-center gap-3">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle2 className="h-8 w-8 text-green-500" /></div>
              <p className="font-bold text-neutral-900">สั่งซื้อสำเร็จ!</p>
              <p className="text-sm text-neutral-500">ระบบกำลังอัปเดตประกาศของคุณ</p>
            </div>
          )}

          {/* Form */}
          {!qrData && !successType && (
            <div className="p-5 space-y-4">
              {/* Package options */}
              <div>
                <div className={`flex items-center gap-2 mb-1.5 ${group.color}`}>
                  {group.icon}
                  <span className="text-sm font-semibold">{group.label}</span>
                </div>
                <p className="text-xs text-neutral-500 mb-2">{group.desc}</p>
                <div className="flex gap-2">
                  {group.options.map((opt) => {
                    const isSelected = selectedKey === opt.key;
                    return (
                      <button key={opt.key} onClick={() => { setSelectedKey(opt.key); setError(null); }}
                        className={`flex-1 rounded-xl border-2 py-3 px-3 text-center transition-all ${
                          isSelected ? `${group.selectedBorder} ${group.selectedBg}` : "border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        <p className="text-xs text-neutral-500">{opt.label}</p>
                        <p className={`text-sm font-bold mt-0.5 ${group.color}`}>{opt.baht.toLocaleString("th-TH")} บาท</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Facebook info */}
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
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                      add Line: {ADMIN_LINE_ID}
                    </a>
                  </div>
                </div>
              )}

              {/* Payment method */}
              {selectedOption && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-neutral-700">วิธีชำระเงิน</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPayMethod("promptpay")}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                        payMethod === "promptpay" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-neutral-200 text-neutral-600 hover:border-orange-300"
                      }`}
                    >
                      <QrCode className="h-4 w-4" />PromptPay QR
                    </button>
                    <button onClick={() => setPayMethod("card")}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                        payMethod === "card" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-neutral-200 text-neutral-600 hover:border-orange-300"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />บัตรเครดิต
                    </button>
                  </div>

                  {payMethod === "card" && (
                    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-xs text-neutral-500 font-medium">ชำระ {selectedOption.baht.toLocaleString("th-TH")} บาท</p>
                      <div>
                        <Label className="text-xs text-neutral-600">หมายเลขบัตร</Label>
                        <Input placeholder="0000 0000 0000 0000" value={cardInfo.number}
                          onChange={(e) => setCardInfo((p) => ({ ...p, number: formatCardNumber(e.target.value) }))}
                          maxLength={19} inputMode="numeric" className="mt-1 font-mono" />
                      </div>
                      <div>
                        <Label className="text-xs text-neutral-600">ชื่อบนบัตร</Label>
                        <Input placeholder="SOMCHAI JAIDEE" value={cardInfo.name}
                          onChange={(e) => setCardInfo((p) => ({ ...p, name: e.target.value.toUpperCase() }))} className="mt-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-neutral-600">วันหมดอายุ</Label>
                          <Input placeholder="MM/YY" value={cardInfo.expiry}
                            onChange={(e) => setCardInfo((p) => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                            maxLength={5} inputMode="numeric" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-neutral-600">CVV</Label>
                          <Input placeholder="123" value={cardInfo.cvv}
                            onChange={(e) => setCardInfo((p) => ({ ...p, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                            maxLength={4} inputMode="numeric" type="password" className="mt-1" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={onClose}>ยกเลิก</Button>
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" disabled={!canSubmit || loading} onClick={handleConfirm}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      กำลังดำเนินการ...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {payMethod === "promptpay" ? "รับ QR Code" : "ชำระเงิน"}
                      {selectedOption && <span className="text-white/80">({selectedOption.baht.toLocaleString("th-TH")} บาท)</span>}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
              <p className="text-center text-xs text-neutral-400">ชำระเงินปลอดภัยโดย Omise</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
