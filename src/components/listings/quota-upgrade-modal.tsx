"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FileText, X, CheckCircle2, ChevronRight, CreditCard, QrCode, Clock } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuotaUpgradeModalProps {
  currentQuota: number;
  onClose: () => void;
}

const PACKAGES = [
  { key: "quota_20", label: "20 ประกาศ", baht: 300, listings: 20 },
  { key: "quota_50", label: "50 ประกาศ", baht: 500, listings: 50 },
  { key: "quota_1200", label: "1,200 ประกาศ", baht: 1000, listings: 1200 },
];

const OMISE_PUBLIC_KEY = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY || "pkey_test_67orguspr2347ve5biw";
const QR_EXPIRE_MIN = 15;

declare global {
  interface Window { Omise: { setPublicKey: (k: string) => void; createToken: (...a: unknown[]) => void }; }
}

interface CardInfo { number: string; name: string; expiry: string; cvv: string; }
interface QrData { chargeId: string; qrImageUrl: string | null; }

export function QuotaUpgradeModal({ currentQuota, onClose }: QuotaUpgradeModalProps) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<"promptpay" | "card">("promptpay");
  const [cardInfo, setCardInfo] = useState<CardInfo>({ number: "", name: "", expiry: "", cvv: "" });
  const [omiseReady, setOmiseReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
    if (!qrData || success) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/omise/check-charge/${qrData.chargeId}`);
        const data = await res.json();
        if (data.status === "successful") {
          setSuccess(true);
          setTimeout(() => { onClose(); router.refresh(); }, 2000);
        } else if (data.status === "failed") {
          setError("QR หมดอายุหรือการชำระเงินล้มเหลว"); setQrData(null);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [qrData, success, onClose, router]);

  // QR countdown
  useEffect(() => {
    if (!qrData || success) return;
    const interval = setInterval(() => {
      setQrMinLeft((p) => { if (p <= 1) { setError("QR หมดอายุแล้ว"); setQrData(null); return 0; } return p - 1; });
    }, 60000);
    return () => clearInterval(interval);
  }, [qrData, success]);

  const selectedPkg = PACKAGES.find((p) => p.key === selectedKey);
  const cardFilled = cardInfo.number.replace(/\s/g, "").length === 16 && cardInfo.name.trim() && cardInfo.expiry.length === 5 && cardInfo.cvv.length >= 3;
  const canConfirm = selectedKey && (payMethod === "promptpay" || cardFilled);

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
    if (!selectedPkg) return;
    if (payMethod === "card" && !omiseReady) { setError("ระบบบัตรยังไม่พร้อม"); return; }
    setError(null);
    setLoading(true);
    try {
      let tokenId: string | undefined;
      if (payMethod === "card") tokenId = await tokenizeCard();

      const res = await fetch("/api/profile/quota-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageKey: selectedKey, paymentMethod: payMethod, tokenId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); setLoading(false); return; }

      if (payMethod === "promptpay") {
        setQrData({ chargeId: data.chargeId, qrImageUrl: data.qrImageUrl });
        setQrMinLeft(QR_EXPIRE_MIN);
      } else {
        setSuccess(true);
        setTimeout(() => { onClose(); router.refresh(); }, 2000);
      }
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50" onClick={(qrData || success) ? undefined : onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center px-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto max-h-[90vh] overflow-y-auto">

          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
            <div>
              <h2 className="text-base font-bold text-neutral-900">เพิ่มจำนวนประกาศ</h2>
              <p className="text-xs text-neutral-500 mt-0.5">ปัจจุบันมีสิทธิ์ {currentQuota} ประกาศ/ปี</p>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 p-1"><X className="h-5 w-5" /></button>
          </div>

          {/* QR view */}
          {qrData && !success && (
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
                ยอดชำระ {selectedPkg?.baht.toLocaleString("th-TH")} บาท
              </p>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                กำลังรอการชำระเงิน...
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button onClick={() => setQrData(null)} className="text-sm text-neutral-400 underline underline-offset-2">ยกเลิก / เปลี่ยนวิธีชำระ</button>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex flex-col items-center py-10 px-5 text-center gap-3">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle2 className="h-8 w-8 text-green-500" /></div>
              <p className="font-bold text-neutral-900">เพิ่มสิทธิ์สำเร็จ!</p>
              <p className="text-sm text-neutral-500">จำนวนประกาศของคุณถูกอัปเดตแล้ว</p>
            </div>
          )}

          {/* Form */}
          {!qrData && !success && (
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                {PACKAGES.map((pkg) => {
                  const isSelected = selectedKey === pkg.key;
                  return (
                    <button key={pkg.key} onClick={() => setSelectedKey(pkg.key)}
                      className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all ${
                        isSelected ? "border-orange-500 bg-orange-50" : "border-neutral-200 hover:border-orange-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isSelected ? "bg-orange-500" : "bg-neutral-100"}`}>
                          <FileText className={`h-4 w-4 ${isSelected ? "text-white" : "text-neutral-500"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">{pkg.label}</p>
                          <p className="text-xs text-neutral-500">ราคาต่อปี</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-orange-600">{pkg.baht.toLocaleString("th-TH")} บาท</p>
                    </button>
                  );
                })}
              </div>

              {selectedPkg && (
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
                      <p className="text-xs text-neutral-500 font-medium">ชำระ {selectedPkg.baht.toLocaleString("th-TH")} บาท</p>
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

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>ยกเลิก</Button>
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" disabled={!canConfirm || loading} onClick={handleConfirm}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      กำลังดำเนินการ...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {payMethod === "promptpay" ? "รับ QR Code" : "ชำระเงิน"}
                      {selectedPkg && <span className="text-white/80">({selectedPkg.baht.toLocaleString("th-TH")} บาท)</span>}
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
