"use client";

import { useState, useEffect, useRef } from "react";
import { Phone, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PhoneVerifyModalProps {
  open: boolean;
  onVerified: () => void;
}

type Step = "phone" | "otp" | "done";

export function PhoneVerifyModal({ open, onVerified }: PhoneVerifyModalProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown]);

  const sendOtp = async () => {
    setError("");
    if (!phone.match(/^0[0-9]{8,9}$/)) {
      setError("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (0XXXXXXXXX)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "ส่ง OTP ไม่สำเร็จ กรุณาลองใหม่");
      } else {
        setStep("otp");
        setCountdown(60);
      }
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setError("กรุณากรอกรหัส OTP 6 หลัก");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
      } else {
        setStep("done");
        setTimeout(onVerified, 1500);
      }
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-orange-500" />
            ยืนยันเบอร์โทรศัพท์
          </DialogTitle>
          <DialogDescription>
            กรุณายืนยันเบอร์โทรศัพท์เพื่อโพสต์ขายอุปกรณ์มือสอง
          </DialogDescription>
        </DialogHeader>

        {step === "phone" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0812345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                maxLength={10}
                onKeyDown={(e) => { if (e.key === "Enter") sendOtp(); }}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              onClick={sendOtp}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              ส่งรหัส OTP
            </Button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              ส่งรหัส OTP ไปยัง <span className="font-medium">{phone}</span> แล้ว
              <br />กรุณากรอกรหัส 6 หลักที่ได้รับ (หมดอายุใน 5 นาที)
            </p>
            <div className="space-y-2">
              <Label htmlFor="otp">รหัส OTP</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                onKeyDown={(e) => { if (e.key === "Enter") verifyOtp(); }}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              onClick={verifyOtp}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              ยืนยัน OTP
            </Button>
            <div className="text-center text-sm text-neutral-500">
              {countdown > 0 ? (
                <span>ส่งรหัสใหม่ได้ใน {countdown} วินาที</span>
              ) : (
                <button
                  onClick={() => { setOtp(""); sendOtp(); }}
                  className="text-orange-600 hover:underline"
                >
                  ส่งรหัสใหม่
                </button>
              )}
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-lg font-semibold text-green-700">ยืนยันเบอร์โทรสำเร็จ</p>
            <p className="text-sm text-neutral-500">กำลังพาไปยังหน้าลงประกาศ...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
