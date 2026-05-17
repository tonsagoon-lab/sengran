"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Star, Megaphone, X, CheckCircle2, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PromoteModalProps {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
}

const PACKAGES = [
  {
    key: "premium",
    icon: <Star className="h-5 w-5" />,
    color: "text-orange-600",
    selectedBorder: "border-orange-500",
    selectedBg: "bg-orange-50",
    label: "ประกาศ Premium หน้าแรก",
    desc: "ติดป้าย Premium โดดเด่น อยู่ใน section แนะนำบนหน้าแรก",
    options: [
      { key: "premium_10", label: "10 วัน", baht: 300 },
      { key: "premium_20", label: "20 วัน", baht: 500 },
    ],
  },
  {
    key: "facebook",
    icon: <Megaphone className="h-5 w-5" />,
    color: "text-indigo-600",
    selectedBorder: "border-indigo-500",
    selectedBg: "bg-indigo-50",
    label: "ยิงโฆษณา Facebook บนเพจ",
    desc: "ยิงโฆษณาบนเพจ facebook.com/selloutthailand",
    options: [
      { key: "facebook_7", label: "7 วัน", baht: 1500 },
      { key: "facebook_15", label: "15 วัน", baht: 3000 },
    ],
  },
];

const FACEBOOK_PAGE = "https://www.facebook.com/selloutthailand/";
const ADMIN_LINE_URL = "https://line.me/R/ti/p/~salebiz";
const ADMIN_LINE_ID = "salesbiz";
const OMISE_PUBLIC_KEY = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY || "pkey_test_67orguspr2347ve5biw";

declare global {
  interface Window { Omise: { setPublicKey: (k: string) => void; createToken: (...a: unknown[]) => void }; }
}

interface CardInfo { number: string; name: string; expiry: string; cvv: string; }

export function PromoteModal({ listingId, listingTitle, onClose }: PromoteModalProps) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState("");
  const [cardInfo, setCardInfo] = useState<CardInfo>({ number: "", name: "", expiry: "", cvv: "" });
  const [omiseReady, setOmiseReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successType, setSuccessType] = useState<string | null>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;
    const s = document.createElement("script");
    s.src = "https://cdn.omise.co/omise.js";
    s.onload = () => { window.Omise?.setPublicKey(OMISE_PUBLIC_KEY); setOmiseReady(true); };
    document.head.appendChild(s);
  }, []);

  const selectedOption = PACKAGES.flatMap((p) => p.options).find((o) => o.key === selectedKey);
  const isFacebook = selectedKey?.startsWith("facebook");
  const cardFilled = cardInfo.number.replace(/\s/g, "").length === 16 && cardInfo.name.trim() && cardInfo.expiry.length === 5 && cardInfo.cvv.length >= 3;
  const canSubmit = selectedKey && (!isFacebook || contactInfo.trim().length > 0) && cardFilled;

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
    if (isFacebook && !contactInfo.trim()) { setError("กรุณาระบุ LINE ID หรือเบอร์โทรศัพท์"); return; }
    if (!omiseReady) { setError("ระบบบัตรยังไม่พร้อม กรุณารอสักครู่"); return; }
    setError(null);
    setLoading(true);
    try {
      const tokenId = await tokenizeCard();
      const res = await fetch(`/api/listings/${listingId}/boost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageKey: selectedKey, contactInfo: contactInfo.trim(), paymentMethod: "card", tokenId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); setLoading(false); return; }
      setSuccessType(isFacebook ? "facebook" : "other");
      setLoading(false);
      if (!isFacebook) setTimeout(() => { onClose(); router.refresh(); }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50" onClick={successType ? undefined : onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center px-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto max-h-[90vh] overflow-y-auto">

          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
            <div>
              <h2 className="text-base font-bold text-neutral-900">โปรโมทประกาศ</h2>
              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{listingTitle}</p>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 p-1"><X className="h-5 w-5" /></button>
          </div>

          {successType === "facebook" && (
            <div className="flex flex-col items-center py-8 px-6 text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <p className="font-bold text-neutral-900 text-lg">สั่งซื้อสำเร็จ!</p>
                <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                  โฆษณาของคุณจะขึ้นบน Facebook ภายใน <span className="font-semibold">1-2 วันทำการ</span>
                </p>
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

          {successType === "other" && (
            <div className="flex flex-col items-center py-10 px-5 text-center gap-3">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <p className="font-bold text-neutral-900">สั่งซื้อสำเร็จ!</p>
              <p className="text-sm text-neutral-500">ระบบกำลังอัปเดตประกาศของคุณ</p>
            </div>
          )}

          {!successType && (
            <div className="p-5 space-y-4">
              {PACKAGES.map((group) => (
                <div key={group.key}>
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
              ))}

              {isFacebook && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                  <p className="text-xs font-medium text-indigo-700">ระบุช่องทางติดต่อกลับ เพื่อให้ admin ประสานงานโฆษณา</p>
                  <div>
                    <Label className="text-xs text-neutral-600">LINE ID หรือเบอร์โทรศัพท์ *</Label>
                    <Input className="mt-1" placeholder="เช่น @mylineid หรือ 08X-XXX-XXXX"
                      value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
                  </div>
                  <p className="text-[11px] text-indigo-600">
                    หรือแอด LINE admin ได้เลยที่{" "}
                    <a href={ADMIN_LINE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">{ADMIN_LINE_ID}</a>
                  </p>
                </div>
              )}

              {selectedOption && (
                <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs text-neutral-500 font-medium">ชำระ {selectedOption.baht.toLocaleString("th-TH")} บาท ด้วยบัตรเครดิต/เดบิต</p>
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
                      ชำระเงิน {selectedOption && `${selectedOption.baht.toLocaleString("th-TH")} บาท`}
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
