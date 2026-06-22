import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Phone,
  MessageCircle,
  MapPin,
  Tag,
  Eye,
  Calendar,
  ExternalLink,
  UserCircle,
  CheckCircle2,
} from "lucide-react";
import { getEquipmentBySlug, getRelatedEquipment } from "@/lib/db/equipment";
import { createClient } from "@/lib/supabase/server";
import { startConversationAction } from "@/lib/actions/messages";
import { ImageGallery } from "@/components/listings/image-gallery";
import { resolveImageUrl } from "@/lib/utils/image-url";
import { ViewCountTracker } from "@/components/listings/view-count-tracker";
import { ShareButton } from "@/components/listings/share-button";
import { ReportButton } from "@/components/listings/report-button";
import { TopMenuBar } from "@/components/top-menu-bar";
import { SearchBox } from "@/components/listings/search-box";
import { SafetyBanner, SafetyTips } from "@/components/equipment/safety-disclaimer";
import { EquipmentCard } from "@/components/equipment/equipment-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.xn--72ch7bybxexd0cc.com";

const CONDITION_LABELS: Record<string, { label: string; className: string }> = {
  excellent: { label: "ดีมาก",  className: "bg-green-100 text-green-700 border-green-200" },
  good:      { label: "ดี",      className: "bg-blue-100 text-blue-700 border-blue-200" },
  fair:      { label: "พอใช้",   className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const STATUS_LABELS: Record<string, string> = {
  reserved: "จองแล้ว",
  sold:     "ขายแล้ว",
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getEquipmentBySlug(decodeURIComponent(slug));
  if (!listing) return { title: "ไม่พบประกาศ" };

  const description = listing.description.slice(0, 160);
  const coverImage = listing.listing_images.sort((a, b) => a.display_order - b.display_order)[0];
  const coverUrl = coverImage
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listings/${coverImage.storage_path}`
    : undefined;

  return {
    title: `${listing.title} — ของมือสอง เซ้งร้าน.com`,
    description,
    alternates: { canonical: `/equipment/${slug}` },
    openGraph: {
      title: listing.title,
      description,
      images: coverUrl ? [{ url: coverUrl }] : undefined,
    },
  };
}

export default async function EquipmentDetailPage({ params }: Props) {
  const { slug } = await params;
  const listing = await getEquipmentBySlug(decodeURIComponent(slug));
  if (!listing) notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const sortedImages = [...listing.listing_images].sort(
    (a, b) => a.display_order - b.display_order
  );

  const related = await getRelatedEquipment(slug, listing.category_id ?? null, listing.province_id ?? null);

  const coverImage = sortedImages[0];
  const coverUrl = coverImage ? resolveImageUrl(coverImage.storage_path) : undefined;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isSeller = user?.id === listing.user_id;
  const sellerId = listing.user_id;

  const displayName = listing.profiles?.display_name ?? listing.contact_name ?? "ผู้ประกาศ";
  const displayMobile = listing.contact_mobile || listing.profiles?.mobile || null;
  const lineId = listing.contact_line || listing.profiles?.line_id || null;
  const sellerVerified = listing.profiles?.phone_verified ?? false;

  const hasCoords = listing.latitude != null && listing.longitude != null;
  const mapEmbedUrl = hasCoords
    ? `https://www.google.com/maps?q=${listing.latitude},${listing.longitude}&z=17&output=embed`
    : null;
  const mapLinkUrl = hasCoords
    ? `https://www.google.com/maps?q=${listing.latitude},${listing.longitude}`
    : null;

  const conditionInfo = listing.condition ? CONDITION_LABELS[listing.condition] : null;
  const statusLabel = STATUS_LABELS[listing.status] ?? null;
  const fmt = new Intl.NumberFormat("th-TH");

  return (
    <>
      <ViewCountTracker slug={slug} />

      <SafetyBanner />

      {/* Search bar */}
      <div className="border-b bg-white py-3 px-4">
        <div className="mx-auto max-w-6xl">
          <SearchBox targetPath="/equipment" />
        </div>
      </div>
      <TopMenuBar />

      {/* Status banner */}
      {statusLabel && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center text-sm text-amber-800 font-semibold">
          ⚠️ รายการนี้ {statusLabel} แล้ว
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-8 pb-28 lg:pb-8">
        <div className="flex gap-8 items-start">
          {/* Main content */}
          <main className="min-w-0 flex-1 space-y-6 overflow-hidden">
            <ImageGallery images={sortedImages} supabaseUrl={supabaseUrl} />

            {/* Title + badges */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {conditionInfo && (
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      conditionInfo.className
                    )}>
                      สภาพ: {conditionInfo.label}
                    </span>
                  )}
                  {listing.categories && (
                    <Badge variant="outline">{listing.categories.name_th}</Badge>
                  )}
                  {statusLabel && (
                    <Badge variant="secondary">{statusLabel}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ShareButton title={listing.title} url={`${BASE_URL}/equipment/${slug}`} />
                  {!isSeller && <ReportButton listingId={listing.id} />}
                </div>
              </div>
              <h1 className="text-2xl font-bold text-neutral-900">{listing.title}</h1>
              {listing.provinces && (
                <div className="flex items-center gap-1 text-sm text-neutral-500">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {[listing.district, listing.provinces.name_th].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* Price */}
            {listing.sale_price != null && (
              <div className="rounded-xl border bg-orange-50 border-orange-100 p-5">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-orange-500" />
                  <span className="text-xl font-bold text-orange-600">
                    ฿{fmt.format(listing.sale_price)}
                  </span>
                </div>
              </div>
            )}

            <Separator />

            {/* Description */}
            <div className="space-y-3">
              <h2 className="font-semibold text-neutral-900">รายละเอียดสินค้า</h2>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                {listing.description}
              </p>
            </div>

            {/* Specs table */}
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {conditionInfo && (
                    <tr className="border-b">
                      <td className="px-4 py-2.5 font-medium text-neutral-500 w-1/3 bg-neutral-50">สภาพ</td>
                      <td className="px-4 py-2.5 text-neutral-800">{conditionInfo.label}</td>
                    </tr>
                  )}
                  {listing.categories && (
                    <tr className="border-b">
                      <td className="px-4 py-2.5 font-medium text-neutral-500 bg-neutral-50">หมวดหมู่</td>
                      <td className="px-4 py-2.5 text-neutral-800">{listing.categories.name_th}</td>
                    </tr>
                  )}
                  {(listing.district || listing.provinces) && (
                    <tr className="border-b">
                      <td className="px-4 py-2.5 font-medium text-neutral-500 bg-neutral-50">ที่ตั้ง</td>
                      <td className="px-4 py-2.5 text-neutral-800">
                        {[listing.district, listing.provinces?.name_th].filter(Boolean).join(", ")}
                      </td>
                    </tr>
                  )}
                  {listing.sale_price != null && (
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-neutral-500 bg-neutral-50">ราคา</td>
                      <td className="px-4 py-2.5 text-neutral-800 font-semibold">
                        ฿{fmt.format(listing.sale_price)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Map */}
            {hasCoords && mapEmbedUrl && mapLinkUrl && (
              <div className="space-y-2">
                {listing.address && (
                  <div className="flex items-start gap-2 text-sm text-neutral-600">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{listing.address}</span>
                  </div>
                )}
                <iframe
                  src={mapEmbedUrl}
                  className="w-full h-72 rounded-xl border"
                  loading="lazy"
                  title="แผนที่สินค้า"
                />
                <a
                  href={mapLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-orange-600 hover:underline"
                >
                  เปิดใน Google Maps
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-neutral-400 pt-2">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{listing.view_count} ครั้ง</span>
              </div>
              {listing.published_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(listing.published_at).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Safety tips */}
            <SafetyTips />

            {/* Related listings */}
            {related.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-neutral-900">อุปกรณ์ที่คล้ายกัน</h2>
                    <Link href="/equipment" className="text-sm text-orange-600 hover:underline">
                      ดูทั้งหมด →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {related.map((r) => (
                      <EquipmentCard key={r.id} listing={r} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </main>

          {/* Seller sidebar (desktop only) */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-20 space-y-3">
            <div className="rounded-2xl border bg-white p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-700">ข้อมูลผู้ขาย</h2>
                {sellerVerified && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    ยืนยันแล้ว
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {listing.profiles?.avatar_url ? (
                  <Image
                    src={listing.profiles.avatar_url}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-12 w-12 text-neutral-300" />
                )}
                <div>
                  <p className="font-medium text-sm text-neutral-900">{displayName}</p>
                  {lineId && (
                    <p className="text-xs text-neutral-400 mt-0.5">LINE: {lineId}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {displayMobile && (
                  <a
                    href={`tel:${displayMobile}`}
                    className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 py-2.5 font-semibold text-sm text-white transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    โทร {displayMobile}
                  </a>
                )}
                {lineId && (
                  <a
                    href={`https://line.me/ti/p/${lineId.startsWith("@") ? lineId : `~${lineId}`}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#06C755] hover:bg-[#05b34c] py-2.5 font-semibold text-sm text-white transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    เพิ่มเพื่อน LINE
                  </a>
                )}
                {!isSeller && (
                  <form action={startConversationAction.bind(null, listing.id, sellerId)}>
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-300 hover:bg-neutral-50 py-2.5 font-semibold text-sm text-neutral-700 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      ส่งข้อความ
                    </button>
                  </form>
                )}
              </div>

              {/* Cover image preview */}
              {coverUrl && (
                <div className="mt-1">
                  <img
                    src={coverUrl}
                    alt={listing.title}
                    className="w-full rounded-lg object-cover max-h-40"
                  />
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky mobile contact */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white px-4 py-3 shadow-lg lg:hidden">
        <div className="mx-auto flex max-w-3xl gap-2">
          {displayMobile ? (
            <a
              href={`tel:${displayMobile}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 py-3 font-semibold text-sm text-white transition-colors"
            >
              <Phone className="h-4 w-4" />
              โทร
            </a>
          ) : (
            <span className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-200 py-3 font-semibold text-sm text-neutral-400 cursor-not-allowed">
              <Phone className="h-4 w-4" />
              โทร
            </span>
          )}
          {lineId && (
            <a
              href={`https://line.me/ti/p/${lineId.startsWith("@") ? lineId : `~${lineId}`}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#06C755] hover:bg-[#05b34c] py-3 font-semibold text-sm text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              LINE
            </a>
          )}
          {!isSeller && (
            <form action={startConversationAction.bind(null, listing.id, sellerId)} className="flex-1">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 py-3 font-semibold text-sm text-neutral-700 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                ข้อความ
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
