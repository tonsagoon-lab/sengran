"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Clock, XCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

const QR_EXPIRE_MINUTES = 15;

export default function PromptPayQrPage() {
  const { chargeId } = useParams<{ chargeId: string }>();
  const router = useRouter();

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"pending" | "successful" | "failed">("pending");
  const [coins, setCoins] = useState<number | null>(null);
  const [minutesLeft, setMinutesLeft] = useState(QR_EXPIRE_MINUTES);
  const [error, setError] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(true);

  // Fetch QR URL on mount from our own API (which fetches from Omise)
  useEffect(() => {
    async function fetchQr() {
      try {
        const res = await fetch(`/api/wallet/charge/${chargeId}`);
        const data = await res.json();
        if (data.qrImageUrl) setQrUrl(data.qrImageUrl);
        if (data.status) setStatus(data.status);
        if (data.coins) setCoins(data.coins);
      } catch {
        setError("ไม่สามารถโหลด QR ได้");
      } finally {
        setLoadingQr(false);
      }
    }
    fetchQr();
  }, [chargeId]);

  // Poll every 3 seconds
  const poll = useCallback(async () => {
    if (status === "successful" || status === "failed") return;
    try {
      const res = await fetch(`/api/wallet/charge/${chargeId}`);
      const data = await res.json();
      if (data.status === "successful") {
        setStatus("successful");
        setCoins(data.coins);
        router.push(`/wallet?topup=success&coins=${data.coins ?? ""}`);
      } else if (data.status === "failed") {
        setStatus("failed");
      }
    } catch {
      // ignore polling errors
    }
  }, [chargeId, status]);

  useEffect(() => {
    if (status !== "pending") return;
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [poll, status]);

  // Countdown timer
  useEffect(() => {
    if (status !== "pending") return;
    const interval = setInterval(() => {
      setMinutesLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatus("failed");
          return 0;
        }
        return prev - 1;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, [status]);

  if (status === "successful") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center space-y-5">
        <div className="flex justify-center">
          <CheckCircle2 className="h-20 w-20 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">ชำระเงินสำเร็จ!</h1>
        <p className="text-neutral-600">
          เพิ่ม{" "}
          <span className="font-bold text-orange-600">
            {coins?.toLocaleString("th-TH")} coins
          </span>{" "}
          เข้ากระเป๋าของคุณแล้ว
        </p>
        <Button
          onClick={() => router.push("/wallet")}
          className="bg-orange-500 hover:bg-orange-600 text-white w-full h-12"
        >
          ดูกระเป๋า coin
        </Button>
      </main>
    );
  }

  if (status === "failed") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center space-y-5">
        <div className="flex justify-center">
          <XCircle className="h-20 w-20 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">QR หมดอายุหรือล้มเหลว</h1>
        <p className="text-neutral-600">กรุณาลองเติม coin ใหม่อีกครั้ง</p>
        <Link href="/wallet/topup">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white w-full h-12">
            กลับไปเติม coin
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-neutral-900">สแกน QR เพื่อชำระเงิน</h1>
        <p className="text-sm text-neutral-500 mt-1">ใช้แอปธนาคารสแกน PromptPay</p>
      </div>

      {/* QR Box */}
      <div className="flex justify-center">
        <div className="rounded-2xl border-2 border-neutral-200 bg-white p-5 shadow-sm">
          {loadingQr ? (
            <div className="h-56 w-56 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-neutral-200 border-t-orange-500 animate-spin" />
            </div>
          ) : qrUrl ? (
            <Image
              src={qrUrl}
              alt="PromptPay QR Code"
              width={224}
              height={224}
              className="rounded-lg"
              unoptimized
            />
          ) : (
            <div className="h-56 w-56 flex flex-col items-center justify-center gap-2 text-neutral-400">
              <QrCode className="h-10 w-10" />
              <p className="text-xs">{error ?? "ไม่มี QR"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Countdown */}
      <div className="flex items-center justify-center gap-2 text-sm text-neutral-600">
        <Clock className="h-4 w-4 text-orange-400" />
        <span>
          QR หมดอายุใน{" "}
          <span className="font-semibold text-orange-600">{minutesLeft} นาที</span>
        </span>
      </div>

      {/* Polling indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-neutral-400">
        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        กำลังรอการชำระเงิน...
      </div>

      <div className="text-center">
        <Link href="/wallet/topup" className="text-sm text-neutral-500 hover:text-orange-600 underline underline-offset-2">
          ยกเลิก
        </Link>
      </div>
    </main>
  );
}
