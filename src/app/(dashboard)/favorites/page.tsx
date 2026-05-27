import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyFavoriteListings } from "@/lib/db/listings";
import { TopMenuBar } from "@/components/top-menu-bar";
import { BrowseCard } from "@/components/listings/browse-card";
import { Heart } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ประกาศที่บันทึกไว้ — เซ้งร้าน.com" , robots: { index: false, follow: false } };

export default async function FavoritesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const listings = await getMyFavoriteListings(user.id);

  return (
    <>
      <TopMenuBar />
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500 fill-red-400" />
          <h1 className="text-xl font-bold text-neutral-900">ประกาศที่บันทึกไว้</h1>
          {listings.length > 0 && (
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
              {listings.length}
            </span>
          )}
        </div>

        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
            <Heart className="h-12 w-12 text-neutral-200" />
            <p className="text-neutral-500">ยังไม่มีประกาศที่บันทึกไว้</p>
            <Link
              href="/listings"
              className="rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              เลือกดูประกาศ
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {listings.map((listing) => (
              <BrowseCard
                key={listing.id}
                listing={listing}
                supabaseUrl={supabaseUrl}
                isFavorited={true}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
