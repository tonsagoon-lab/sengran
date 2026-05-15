"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Coins, X } from "lucide-react";

export function TopupSuccessModal({ coins }: { coins?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => handleClose(), 8000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    setOpen(false);
    router.replace("/wallet");
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.5)" }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          width: "min(380px, calc(100vw - 32px))",
          background: "#fff",
          borderRadius: "20px",
          padding: "36px 28px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          textAlign: "center",
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{ position: "absolute", top: 14, right: 14, padding: 4, color: "#9ca3af" }}
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <CheckCircle2 size={44} color="#22c55e" />
          </div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 6 }}>
          เติม coin สำเร็จ!
        </h2>
        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
          coin ถูกเพิ่มเข้ากระเป๋าของคุณเรียบร้อยแล้ว
        </p>

        {coins && coins > 0 && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#fff7ed", border: "1px solid #fed7aa",
            borderRadius: 999, padding: "10px 20px", marginBottom: 20
          }}>
            <Coins size={18} color="#f97316" />
            <span style={{ fontSize: 20, fontWeight: 700, color: "#ea580c" }}>
              +{coins.toLocaleString("th-TH")} coins
            </span>
          </div>
        )}

        <button
          onClick={handleClose}
          style={{
            width: "100%", padding: "12px 0",
            background: "#f97316", color: "#fff",
            border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 600, cursor: "pointer"
          }}
        >
          ดูกระเป๋า coin
        </button>

        <p style={{ marginTop: 12, fontSize: 12, color: "#9ca3af" }}>
          ปิดอัตโนมัติใน 8 วินาที
        </p>
      </div>
    </>
  );
}
