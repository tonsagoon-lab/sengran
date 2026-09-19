import Link from "next/link";
import { redirect } from "next/navigation";
import { Megaphone, Handshake, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyListings } from "@/lib/db/listings";
import { getSiteSetting } from "@/lib/db/admin";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listings/listing-card";
import { QuotaUpgradeButton } from "@/components/listings/quota-upgrade-button";

export const metadata = { title: "ประกาศของฉัน — เซ้งร้าน.com" , robots: { index: false, follow: false } };

export default async function MyListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [listings, profile, quotaButtonSetting, promoteButtonsSetting] = await Promise.all([
    getMyListings(user.id),
    supabase.from("profiles").select("listing_quota").eq("id", user.id).single().then((r) => r.data),
    getSiteSetting("show_quota_upgrade_button"),
    getSiteSetting("show_promote_buttons"),
  ]);

  const listingQuota = Number(profile?.listing_quota ?? 0);
  const showQuotaButton = quotaButtonSetting === "true";
  const showPromoteButtons = promoteButtonsSetting === "true";

  const published = listings.filter((l) => l.status === "published");
  const hidden = listings.filter((l) => l.status === "hidden");
  const sold = listings.filter((l) => l.status === "sold");
  const drafts = listings.filter((l) => l.status === "draft");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">ประกาศของฉัน</h1>
          <p className="text-xs text-neutral-400 mt-0.5">สิทธิ์ประกาศ: {published.length} / {listingQuota} ประกาศ/ปี</p>
        </div>
        <Link
          href="/listings/new"
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-base leading-none">+</span>
          <span>ลงประกาศ</span>
          <span className="rounded-md bg-yellow-300 px-1.5 py-0.5 text-[11px] font-extrabold text-rose-700 shadow-sm animate-pulse">
            ฟรี
          </span>
        </Link>
      </div>

      {/* CTA banner */}
      {showQuotaButton && (
        <div className="flex gap-2 mb-4">
          <QuotaUpgradeButton currentQuota={listingQuota} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Link
          href="/services"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 p-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-white/15 blur-lg" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
              <Megaphone className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left text-white">
              <p className="text-[11px] font-medium uppercase tracking-wide text-white/80">ซื้อโฆษณา</p>
              <p className="text-base font-bold leading-tight">เริ่มเพียง 990.-</p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/90 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/services"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-500 to-teal-500 p-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-white/15 blur-lg" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
              <Handshake className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left text-white">
              <p className="text-[11px] font-medium uppercase tracking-wide text-white/80">ฝากเซ้งร้าน</p>
              <p className="text-base font-bold leading-tight">ค่านายหน้าเพียง 5%</p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/90 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          <p className="mb-4">คุณยังไม่มีประกาศ</p>
          <Link href="/listings/new">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              ลงประกาศแรกของคุณ
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {published.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                เผยแพร่แล้ว ({published.length})
              </h2>
              <div className="space-y-3">
                {published.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} showPromoteButtons={showPromoteButtons} />
                ))}
              </div>
            </section>
          )}
          {hidden.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                ซ่อนอยู่ ({hidden.length})
              </h2>
              <div className="space-y-3">
                {hidden.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} showPromoteButtons={showPromoteButtons} />
                ))}
              </div>
            </section>
          )}
          {sold.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                ขายแล้ว ({sold.length})
              </h2>
              <div className="space-y-3">
                {sold.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} showPromoteButtons={showPromoteButtons} />
                ))}
              </div>
            </section>
          )}
          {drafts.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                แบบร่าง ({drafts.length})
              </h2>
              <div className="space-y-3">
                {drafts.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} showPromoteButtons={showPromoteButtons} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
