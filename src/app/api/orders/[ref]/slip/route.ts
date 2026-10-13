import { NextResponse } from "next/server";

// Slip upload is disabled — all orders are now handled via LINE OA (@salebiz).
// Endpoint kept to short-circuit any stale clients/bookmarks with a clear response.
export async function POST() {
  return NextResponse.json(
    { error: "ระบบรับสลิปปิดใช้งานแล้ว กรุณาสั่งซื้อผ่าน LINE: @salebiz" },
    { status: 410 }
  );
}
