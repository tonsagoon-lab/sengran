import { NextRequest, NextResponse } from "next/server";
import { getAmphuresByProvinceName } from "@/lib/thai-admin";

export async function GET(req: NextRequest) {
  const province = req.nextUrl.searchParams.get("province")?.trim();
  if (!province) return NextResponse.json([], { status: 200 });
  const amphures = getAmphuresByProvinceName(province);
  return NextResponse.json(
    amphures.map((a) => ({ id: a.id, name_th: a.name_th, name_en: a.name_en })),
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable" } },
  );
}
