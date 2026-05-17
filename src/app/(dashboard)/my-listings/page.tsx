import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyListings } from "@/lib/db/listings";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listings/listing-card";
import { QuotaUpgradeButton } from "@/components/listings/quota-upgrade-button";

export const metadata = { title: "ประกาศของฉัน — เซ้งร้าน.com" };

export default async function MyListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const listings = await getMyListings(user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_balance, listing_quota")
    .eq("id", user.id)
    .single();
  const walletBalance = Math.floor(Number(profile?.wallet_balance ?? 0));
  const listingQuota = Number(profile?.listing_quota ?? 0);

  const published = listings.filter((l) => l.status === "published");
  const hidden = listings.filter((l) => l.status === "hidden");
  const sold = listings.filter((l) => l.status === "sold");
  const drafts = listings.filter((l) => l.status === "draft");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">ประกาศของฉัน</h1>
        <Link href="/listings/new">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            + ลงประกาศใหม่
          </Button>
        </Link>
      </div>

      {/* CTA banner */}
      <div className="flex gap-2 mb-4">
        <QuotaUpgradeButton walletBalance={walletBalance} currentQuota={listingQuota} />
      </div>

      <div className="flex gap-2 mb-6">
        <a
          href="https://line.me/R/ti/p/~salebiz"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 py-2.5 text-sm font-semibold text-white transition-colors text-center"
        >
          ซื้อโฆษณาเซ้งร้าน
        </a>
        <a
          href="https://line.me/R/ti/p/~salebiz"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] py-2.5 text-sm font-semibold text-white transition-colors text-center"
        >
          ฝากเซ้งร้าน
        </a>
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
                  <ListingCard key={listing.id} listing={listing} walletBalance={walletBalance} />
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
                  <ListingCard key={listing.id} listing={listing} />
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
                  <ListingCard key={listing.id} listing={listing} />
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
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
