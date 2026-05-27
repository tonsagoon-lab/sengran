"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Coins, CreditCard, QrCode, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Package {
  baht: number;
  coins: number;
}

const PACKAGES: Package[] = [
  { baht: 300, coins: 300 },
  { baht: 500, coins: 500 },
  { baht: 1500, coins: 1500 },
  { baht: 3000, coins: 3000 },
  { baht: 10000, coins: 10000 },
];

declare global {
  interface Window {
    Omise: { setPublicKey: (k: string) => void; createToken: (...a: unknown[]) => void };
  }
}

const OMISE_PUBLIC_KEY = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY || "pkey_test_67orguspr2347ve5biw";

interface CardInfo {
  number: string;
  name: string;
  expiry: string; // MM/YY
  cvv: string;
}

export function TopupForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [selectedBaht, setSelectedBaht] = useState<number | null>(null);
  const [customBaht, setCustomBaht] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"promptpay" | "card">("promptpay");
  const [cardInfo, setCardInfo] = useState<CardInfo>({ number: "", name: "", expiry: "", cvv: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [omiseReady, setOmiseReady] = useState(false);
  const [successCoins, setSuccessCoins] = useState<number | null>(null);
  const scriptLoaded = useRef(false);

  // Load Omise.js
  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;
    const script = document.createElement("script");
    script.src = "https://cdn.omise.co/omise.js";
    script.onload = () => {
      window.Omise?.setPublicKey(OMISE_PUBLIC_KEY);
      setOmiseReady(true);
    };
    document.head.appendChild(script);
  }, []);

  const effectiveBaht = selectedBaht ?? (customBaht ? Number(customBaht) : 0);
  const selectedPkg = PACKAGES.find((p) => p.baht === effectiveBaht);
  const effectiveCoins = selectedPkg ? selectedPkg.coins : effectiveBaht;

  function formatCardNumber(val: string) {
    return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }

  function formatExpiry(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  }

  function tokenizeCard(): Promise<string> {
    return new Promise((resolve, reject) => {
      const [expMonth, expYear] = cardInfo.expiry.split("/");
      window.Omise.createToken(
        "card",
        {
          number: cardInfo.number.replace(/\s/g, ""),
          expiration_month: Number(expMonth),
          expiration_year: Number("20" + expYear),
          security_code: cardInfo.cvv,
          name: cardInfo.name,
        },
        (status: number, response: { id?: string; message?: string }) => {
          if (status === 200 && response.id) {
            resolve(response.id);
          } else {
            reject(new Error(response.message ?? "Card tokenization failed"));
          }
        }
      );
    });
  }

  async function handleSubmit() {
    setError(null);

    if (effectiveBaht < 100) {
      setError("จำนวนขั้นต่ำ 100 บาท");
      return;
    }

    setLoading(true);

    try {
      let tokenId: string | undefined;
      if (paymentMethod === "card") {
        if (!omiseReady) {
          setError("ระบบการ์ดยังไม่พร้อม กรุณารอสักครู่");
          setLoading(false);
          return;
        }
        tokenId = await tokenizeCard();
      }

      const res = await fetch("/api/wallet/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod, baht: effectiveBaht, tokenId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "เกิดข้อผิดพลาด");
        setLoading(false);
        return;
      }

      if (paymentMethod === "promptpay") {
        router.push(`/wallet/topup/${data.chargeId}`);
      } else {
        if (data.status === "successful") {
          setSuccessCoins(data.coins ?? effectiveCoins);
          setLoading(false);
        } else {
          setError("การชำระเงินไม่สำเร็จ กรุณาลองอีกครั้ง");
          setLoading(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setLoading(false);
    }
  }

  // Suppress unused userId warning — passed for future use
  void userId;

  if (successCoins !== null) {
    return (
      <div className="flex flex-col items-center text-center py-8 space-y-5">
        <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">เติม coin สำเร็จ!</h2>
          <p className="text-neutral-500 mt-1 text-sm">coin ถูกเพิ่มเข้ากระเป๋าของคุณแล้ว</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-orange-50 border border-orange-200 px-6 py-3">
          <Coins className="h-5 w-5 text-orange-500" />
          <span className="text-2xl font-bold text-orange-600">
            +{successCoins.toLocaleString("th-TH")} coins
          </span>
        </div>
        <Button
          onClick={() => router.push("/wallet")}
          className="w-full max-w-xs bg-orange-500 hover:bg-orange-600 text-white h-12 text-base font-semibold"
        >
          ดูกระเป๋า coin
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Coins className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-bold text-neutral-900">เติม coin</h1>
      </div>

      {/* Package grid */}
      <div>
        <p className="text-sm font-medium text-neutral-700 mb-3">เลือกแพ็กเกจ</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.baht}
              onClick={() => {
                setSelectedBaht(pkg.baht);
                setCustomBaht("");
              }}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                selectedBaht === pkg.baht && !customBaht
                  ? "border-orange-500 bg-orange-50"
                  : "border-neutral-200 hover:border-orange-300 hover:bg-orange-50/50"
              }`}
            >
              <p className="text-lg font-bold text-neutral-900">
                {pkg.baht.toLocaleString("th-TH")}
                <span className="text-xs font-normal text-neutral-500 ml-1">บาท</span>
              </p>
              <p className="text-sm font-semibold text-orange-600 mt-0.5">
                {pkg.coins.toLocaleString("th-TH")} coins
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount */}
      <div>
        <Label htmlFor="custom-amount" className="text-sm font-medium text-neutral-700">
          ระบุจำนวนเอง (ขั้นต่ำ 100 บาท — ไม่มีโบนัส)
        </Label>
        <div className="relative mt-1.5">
          <Input
            id="custom-amount"
            type="number"
            min={100}
            placeholder="เช่น 300"
            value={customBaht}
            onChange={(e) => {
              setCustomBaht(e.target.value);
              setSelectedBaht(null);
            }}
            className="pr-12"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
            บาท
          </span>
        </div>
        {customBaht && Number(customBaht) >= 100 && (
          <p className="mt-1 text-xs text-neutral-500">
            ได้รับ {Number(customBaht).toLocaleString("th-TH")} coins
          </p>
        )}
      </div>

      {/* Summary bar */}
      {effectiveBaht >= 100 && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-700">
              ชำระ{" "}
              <span className="font-bold text-neutral-900">
                {effectiveBaht.toLocaleString("th-TH")} บาท
              </span>
            </p>
            <p className="text-xs text-neutral-500">
              รับ {effectiveCoins.toLocaleString("th-TH")} coins
            </p>
          </div>
          <Coins className="h-5 w-5 text-orange-400" />
        </div>
      )}

      {/* Payment method */}
      <div>
        <p className="text-sm font-medium text-neutral-700 mb-2">วิธีชำระเงิน</p>
        <div className="flex gap-2">
          <button
            onClick={() => setPaymentMethod("promptpay")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-all ${
              paymentMethod === "promptpay"
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-neutral-200 text-neutral-600 hover:border-orange-300"
            }`}
          >
            <QrCode className="h-4 w-4" />
            PromptPay
          </button>
          <button
            onClick={() => setPaymentMethod("card")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-all ${
              paymentMethod === "card"
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-neutral-200 text-neutral-600 hover:border-orange-300"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            บัตรเครดิต
          </button>
        </div>
      </div>

      {/* Card fields */}
      {paymentMethod === "card" && (
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <div>
            <Label className="text-xs text-neutral-600">หมายเลขบัตร</Label>
            <Input
              placeholder="0000 0000 0000 0000"
              value={cardInfo.number}
              onChange={(e) =>
                setCardInfo((prev) => ({ ...prev, number: formatCardNumber(e.target.value) }))
              }
              maxLength={19}
              inputMode="numeric"
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label className="text-xs text-neutral-600">ชื่อบนบัตร</Label>
            <Input
              placeholder="SOMCHAI JAIDEE"
              value={cardInfo.name}
              onChange={(e) =>
                setCardInfo((prev) => ({ ...prev, name: e.target.value.toUpperCase() }))
              }
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-neutral-600">วันหมดอายุ</Label>
              <Input
                placeholder="MM/YY"
                value={cardInfo.expiry}
                onChange={(e) =>
                  setCardInfo((prev) => ({ ...prev, expiry: formatExpiry(e.target.value) }))
                }
                maxLength={5}
                inputMode="numeric"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-neutral-600">CVV</Label>
              <Input
                placeholder="123"
                value={cardInfo.cvv}
                onChange={(e) =>
                  setCardInfo((prev) => ({
                    ...prev,
                    cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                  }))
                }
                maxLength={4}
                inputMode="numeric"
                type="password"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* LINE contact */}
      <a
        href="https://line.me/R/ti/p/~salebiz"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#06C755] hover:bg-[#05a847] py-3 text-white font-semibold transition-colors text-base h-12"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M19.952 12.477c0-4.185-4.194-7.588-9.352-7.588S1.248 8.292 1.248 12.477c0 3.752 3.327 6.893 7.822 7.49.305.066.72.2.825.46.094.236.062.606.03.845l-.133.8c-.041.236-.188.923.809.503 1-.42 5.374-3.165 7.33-5.418 1.351-1.482 2.021-2.987 2.021-4.68z"/></svg>
        ติดต่อสั่งซื้อผ่าน LINE
      </a>

      <p className="text-center text-xs text-neutral-400">
        ทีมงานจะติดต่อกลับเพื่อยืนยันและรับชำระเงิน
      </p>
    </div>
  );
}
