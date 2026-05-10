import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "เซ้งร้าน.com — ซื้อ ขาย เซ้งร้าน ทำเลดี";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 24,
            background: "#f97316",
            marginBottom: 32,
            fontSize: 64,
          }}
        >
          🏪
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#1c1917",
            marginBottom: 16,
            letterSpacing: "-1px",
          }}
        >
          เซ้งร้าน.com
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#78716c",
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          ตลาดซื้อ ขาย เซ้งร้านค้าและพื้นที่เชิงพาณิชย์
        </div>
      </div>
    ),
    size,
  );
}
