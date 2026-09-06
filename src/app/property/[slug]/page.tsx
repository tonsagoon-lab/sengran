import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import Image from "next/image";
import { Phone, MessageCircle, MapPin, Tag, Eye, Calendar, ExternalLink, UserCircle } from "lucide-react";
import { getListingBySlug, getRelatedListings } from "@/lib/db/listings";
import { getSiteSetting } from "@/lib/db/admin";
import { createClient } from "@/lib/supabase/server";
import { startConversationAction } from "@/lib/actions/messages";
import { ImageGallery } from "@/components/listings/image-gallery";
import { resolveImageUrl } from "@/lib/utils/image-url";
import { publicViewCount } from "@/lib/utils/view-count";
import { ViewCountTracker } from "@/components/listings/view-count-tracker";
import { RichTextDisplay } from "@/components/rich-text-display";
import { SearchBox } from "@/components/listings/search-box";
import { BrowseCard } from "@/components/listings/browse-card";
import { ShareButton } from "@/components/listings/share-button";
import { ReportButton } from "@/components/listings/report-button";
import { TopMenuBar } from "@/components/top-menu-bar";
import { stripHtmlTags } from "@/lib/utils/html";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.xn--72ch7bybxexd0cc.com";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(decodeURIComponent(slug));
  if (!listing) return { title: "ไม่พบประกาศ" };

  const descText = stripHtmlTags(listing.description).slice(0, 160);

  const coverImage = listing.listing_images.sort((a, b) => a.display_order - b.display_order)[0];
  const coverUrl = coverImage
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listings/${coverImage.storage_path}`
    : undefined;

  return {
    title: `${listing.title} — เซ้งร้าน.com`,
    description: descText,
    alternates: { canonical: `/property/${slug}` },
    openGraph: {
      title: listing.title,
      description: descText,
      images: coverUrl ? [{ url: coverUrl }] : undefined,
    },
  };
}

const TYPE_LABELS: Record<string, string> = {
  sale: "เซ้ง",
  rent: "ให้เช่า",
  both: "เซ้งและให้เช่า",
};

function formatPrice(price: number) {
  return price.toLocaleString("th-TH");
}

export default async function ListingDetailPage({ params }: Props) {
  const { slug } = await params;
  const listing = await getListingBySlug(decodeURIComponent(slug));
  if (!listing) notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const sortedImages = [...listing.listing_images].sort(
    (a, b) => a.display_order - b.display_order
  );

  const [related, showViewCountSetting] = await Promise.all([
    getRelatedListings(slug, listing.province_id, listing.category_id),
    getSiteSetting("show_view_count"),
  ]);
  const showViewCount = showViewCountSetting !== "false";

  const coverImage = sortedImages[0];
  const coverUrl = coverImage ? resolveImageUrl(coverImage.storage_path) : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: stripHtmlTags(listing.description).slice(0, 500),
    url: `${BASE_URL}/property/${slug}`,
    ...(coverUrl ? { image: [coverUrl] } : {}),
    ...(listing.sale_price != null
      ? {
          offers: {
            "@type": "Offer",
            price: listing.sale_price,
            priceCurrency: "THB",
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
    ...(listing.provinces
      ? {
          locationCreated: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: listing.district ?? listing.provinces.name_th,
              addressRegion: listing.provinces.name_th,
              addressCountry: "TH",
            },
          },
        }
      : {}),
  };

  // Current user (for message button)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isSeller = user?.id === listing.user_id;
  const sellerId = listing.user_id;

  const isPlaceholder = (v: string | null | undefined) =>
    !v || v === "ไม่ระบุ" || v.trim() === "";

  const displayName = isPlaceholder(listing.contact_name)
    ? (listing.profiles?.display_name ?? "ผู้ประกาศ")
    : listing.contact_name;

  const displayMobile = isPlaceholder(listing.contact_mobile)
    ? (listing.profiles?.mobile ?? null)
    : listing.contact_mobile;

  // Use profile's live LINE ID if listing snapshot is missing
  const lineId = listing.contact_line || listing.profiles?.line_id || null;

  const hasCoords = listing.latitude != null && listing.longitude != null;
  const mapEmbedUrl = hasCoords
    ? `https://www.google.com/maps?q=${listing.latitude},${listing.longitude}&z=17&output=embed`
    : null;
  const mapLinkUrl = hasCoords
    ? `https://www.google.com/maps?q=${listing.latitude},${listing.longitude}`
    : null;

  const isExpired = listing.status === "expired";

  return (
    <>
      <Script
        id="json-ld-listing"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ViewCountTracker slug={slug} />

      {/* Search bar at top */}
      <div className="border-b bg-white py-3 px-4">
        <div className="mx-auto max-w-6xl">
          <SearchBox targetPath="/listings" />
        </div>
      </div>

      {/* TopMenuBar right before image */}
      <TopMenuBar />

      {isExpired && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center text-sm text-amber-800">
          ⚠️ ประกาศนี้มีอายุมากกว่า 1 ปี ข้อมูลอาจไม่เป็นปัจจุบัน
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-8 pb-28 lg:pb-8">
        <div className="flex gap-8 items-start">

          {/* ── Main content ── */}
          <main className="min-w-0 flex-1 space-y-6 overflow-hidden">
        {/* Gallery */}
        <ImageGallery images={sortedImages} supabaseUrl={supabaseUrl} />

        {/* Title + badges */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{TYPE_LABELS[listing.listing_type]}</Badge>
              {listing.categories && (
                <Badge variant="outline">{listing.categories.name_th}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ShareButton title={listing.title} url={`${BASE_URL}/property/${slug}`} />
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

        {/* Price block */}
        <div className="rounded-xl border bg-orange-50 border-orange-100 p-5 space-y-2">
          {listing.sale_price != null && (
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-orange-500" />
              <span className="text-lg font-bold text-orange-600">
                ราคาเซ้ง: {formatPrice(listing.sale_price)} บาท
              </span>
            </div>
          )}
          {listing.rent_price != null && (
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-orange-500" />
              <span className="text-lg font-bold text-orange-600">
                ค่าเช่า: {formatPrice(listing.rent_price)} บาท/เดือน
              </span>
            </div>
          )}
          {listing.deposit_months != null && (listing.listing_type === "rent" || listing.listing_type === "both") && (
            <p className="text-sm text-neutral-600">มัดจำ {listing.deposit_months} เดือน</p>
          )}
          {listing.revenue_amount != null && (
            <div className="flex items-start gap-2 pt-1 border-t border-orange-100">
              <Tag className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-base font-semibold text-green-700">
                  รายได้: {formatPrice(listing.revenue_amount)} บาท
                  <span className="text-sm font-normal text-green-600 ml-1">
                    {listing.revenue_period === "yearly"
                      ? "ต่อปี"
                      : listing.revenue_period === "quarterly_avg"
                      ? "เฉลี่ย 3 เดือน"
                      : "เดือนล่าสุด"}
                  </span>
                </span>
                <p className="text-xs text-neutral-400 mt-0.5">(โปรดตรวจสอบอีกครั้ง)</p>
              </div>
            </div>
          )}
          {(displayMobile || lineId) && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-orange-100">
              {displayMobile && (
                <a
                  href={`tel:${displayMobile}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-orange-200 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {displayMobile}
                </a>
              )}
              {lineId && (
                <a
                  href={`https://line.me/ti/p/${lineId.startsWith("@") ? lineId : `~${lineId}`}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-green-200 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  LINE: {lineId}
                </a>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Description (rich text) */}
        <div className="space-y-3">
          <h2 className="font-semibold text-neutral-900">รายละเอียด</h2>
          <RichTextDisplay html={listing.description} />
        </div>

        {/* Address text */}
        {listing.address && !hasCoords && (
          <div className="flex items-start gap-2 text-sm text-neutral-600">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{listing.address}</span>
          </div>
        )}

        {/* Google Maps embed */}
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
              title="แผนที่ร้าน"
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

        {/* Meta footer */}
        <div className="flex items-center gap-4 text-xs text-neutral-400 pt-2">
          {showViewCount && (() => {
            const displayed = publicViewCount(listing.view_count, listing.view_count_seed);
            return displayed == null ? null : (
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{displayed.toLocaleString("th-TH")} ครั้ง</span>
              </div>
            );
          })()}
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

        {/* Seller info (mobile only — desktop uses the sidebar) */}
        <Separator className="lg:hidden" />
        <div className="lg:hidden rounded-2xl border bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-neutral-700">ข้อมูลผู้ประกาศ</h2>
          <div className="flex items-center gap-3">
            {listing.profiles?.avatar_url ? (
              <Image
                src={listing.profiles.avatar_url}
                alt={displayName}
                width={44}
                height={44}
                className="rounded-full object-cover"
              />
            ) : (
              <UserCircle className="h-11 w-11 text-neutral-300" />
            )}
            <div className="min-w-0">
              <p className="font-medium text-sm text-neutral-900 truncate">{displayName}</p>
              {lineId && (
                <p className="text-xs text-neutral-400 mt-0.5 truncate">LINE: {lineId}</p>
              )}
            </div>
          </div>
          <Link
            href={`/user/${sellerId}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-orange-300 bg-orange-50 hover:bg-orange-100 py-2.5 text-sm font-semibold text-orange-700 transition-colors"
          >
            ประกาศอื่นๆ ของผู้ประกาศรายนี้ →
          </Link>
        </div>

        {/* Related listings */}
        {related.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-neutral-900">ประกาศใกล้เคียง</h2>
                {listing.provinces && (
                  <Link
                    href={`/city/${listing.provinces.slug}`}
                    className="text-sm text-orange-600 hover:underline"
                  >
                    ดูทั้งหมด →
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {related.map((r) => (
                  <BrowseCard key={r.id} listing={r} supabaseUrl={supabaseUrl} />
                ))}
              </div>
            </div>
          </>
        )}
          </main>

          {/* ── Seller sidebar (desktop only) ── */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-20 space-y-3">
            <div className="rounded-2xl border bg-white p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-semibold text-neutral-700">ข้อมูลผู้ประกาศ</h2>

              {/* Avatar + name */}
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

              {/* Contact buttons */}
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
                <Link
                  href={`/user/${sellerId}`}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-orange-300 bg-orange-50 hover:bg-orange-100 py-2.5 font-semibold text-sm text-orange-700 transition-colors"
                >
                  ประกาศอื่นๆ ของผู้ประกาศรายนี้ →
                </Link>
              </div>
            </div>
          </aside>

        </div>{/* end flex */}
      </div>{/* end outer container */}

      {/* Sticky contact bar (mobile only) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white px-4 py-3 shadow-lg lg:hidden">
        <div className="mx-auto flex max-w-3xl gap-2">
          {displayMobile && (
            <a
              href={`tel:${displayMobile}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 py-3 font-semibold text-sm text-white transition-colors"
            >
              <Phone className="h-4 w-4" />
              โทร
            </a>
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
