import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyListings } from "@/lib/db/listings";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listings/listing-card";

export const metadata = { title: "ประกาศของฉัน — เซ้งร้าน.com" };

export default async function MyListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const listings = await getMyListings(user.id);

  const published = listings.filter((l) => l.status === "published");
  const drafts = listings.filter((l) => l.status !== "published");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">ประกาศของฉัน</h1>
        <Link href="/listings/new">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            + ลงประกาศใหม่
          </Button>
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
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </section>
          )}
          {drafts.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                แบบร่าง / อื่นๆ ({drafts.length})
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
