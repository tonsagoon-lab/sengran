import { NextRequest, NextResponse } from "next/server";
import { getTambonsByAmphureId } from "@/lib/thai-admin";

export async function GET(req: NextRequest) {
  const districtIdStr = req.nextUrl.searchParams.get("districtId");
  const districtId = districtIdStr ? Number(districtIdStr) : NaN;
  if (!Number.isFinite(districtId)) return NextResponse.json([], { status: 200 });
  const tambons = getTambonsByAmphureId(districtId);
  return NextResponse.json(
    tambons.map((t) => ({ id: t.id, name_th: t.name_th, name_en: t.name_en, zip_code: t.zip_code })),
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable" } },
  );
}
