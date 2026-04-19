import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Phone, MessageCircle, MapPin, Tag, Ruler, Eye, Calendar, ExternalLink } from "lucide-react";
import { getListingBySlug } from "@/lib/db/listings";
import { ImageGallery } from "@/components/listings/image-gallery";
import { ViewCountTracker } from "@/components/listings/view-count-tracker";
import { RichTextDisplay } from "@/components/rich-text-display";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { stripHtmlTags } from "@/components/rich-text-display";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return { title: "ไม่พบประกาศ" };

  const descText = stripHtmlTags(listing.description).slice(0, 160);

  return {
    title: `${listing.title} — เซ้งร้าน.com`,
    description: descText,
    openGraph: {
      title: listing.title,
      description: descText,
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
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const sortedImages = [...listing.listing_images].sort(
    (a, b) => a.display_order - b.display_order
  );

  const hasCoords = listing.latitude != null && listing.longitude != null;
  const mapEmbedUrl = hasCoords
    ? `https://www.google.com/maps?q=${listing.latitude},${listing.longitude}&z=16&output=embed`
    : null;
  const mapLinkUrl = hasCoords
    ? `https://www.google.com/maps?q=${listing.latitude},${listing.longitude}`
    : null;

  return (
    <>
      <ViewCountTracker slug={slug} />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Gallery */}
        <ImageGallery images={sortedImages} supabaseUrl={supabaseUrl} />

        {/* Title + badges */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{TYPE_LABELS[listing.listing_type]}</Badge>
            {listing.categories && (
              <Badge variant="outline">{listing.categories.name_th}</Badge>
            )}
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
          {listing.deposit_months != null && (
            <p className="text-sm text-neutral-600">มัดจำ {listing.deposit_months} เดือน</p>
          )}
          {listing.price_note && (
            <p className="text-sm text-neutral-600">{listing.price_note}</p>
          )}
        </div>

        <Separator />

        {/* Description (rich text) */}
        <div className="space-y-3">
          <h2 className="font-semibold text-neutral-900">รายละเอียด</h2>
          <RichTextDisplay html={listing.description} />
        </div>

        {/* Area */}
        {listing.area_sqm && (
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Ruler className="h-4 w-4" />
            <span>พื้นที่ใช้สอย {listing.area_sqm} ตร.ม.</span>
          </div>
        )}

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

        <Separator />

        {/* Contact */}
        <div className="rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-neutral-900">ติดต่อผู้ลงประกาศ</h2>
          <p className="text-sm font-medium">{listing.contact_name}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`tel:${listing.contact_mobile}`}
              className="flex items-center gap-2 justify-center rounded-lg bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 font-medium text-sm transition-colors"
            >
              <Phone className="h-4 w-4" />
              {listing.contact_mobile}
            </a>
            {listing.contact_line && (
              <a
                href={`https://line.me/ti/p/~${listing.contact_line.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 justify-center rounded-lg bg-green-500 hover:bg-green-600 text-white px-5 py-3 font-medium text-sm transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                LINE: {listing.contact_line}
              </a>
            )}
          </div>
        </div>

        {/* Meta footer */}
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
      </main>
    </>
  );
}
