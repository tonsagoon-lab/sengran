import { notFound } from "next/navigation";
import Image from "next/image";
import { UserCircle } from "lucide-react";
import type { Metadata } from "next";
import { TopMenuBar } from "@/components/top-menu-bar";
import { BrowseCard } from "@/components/listings/browse-card";
import { getListingsByUser, getUserProfile } from "@/lib/db/listings";

export const revalidate = 60;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getUserProfile(id);
  const name = profile?.display_name || "ผู้ประกาศ";
  return {
    title: `ประกาศทั้งหมดของ ${name} — เซ้งร้าน.com`,
    robots: { index: false, follow: true },
  };
}

export default async function UserListingsPage({ params }: Props) {
  const { id } = await params;
  const [profile, listings] = await Promise.all([
    getUserProfile(id),
    getListingsByUser(id, { limit: 48 }),
  ]);

  if (!profile) notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const displayName = profile.display_name || "ผู้ประกาศ";

  return (
    <>
      <TopMenuBar />
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={displayName}
              width={56}
              height={56}
              className="rounded-full object-cover"
            />
          ) : (
            <UserCircle className="h-14 w-14 text-neutral-300" />
          )}
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">{displayName}</h1>
            <p className="text-sm text-neutral-500">
              ประกาศทั้งหมด {listings.length} รายการ
            </p>
          </div>
        </div>

        {listings.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-12">
            ผู้ประกาศรายนี้ยังไม่มีประกาศที่เผยแพร่
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {listings.map((l) => (
              <BrowseCard key={l.id} listing={l} supabaseUrl={supabaseUrl} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
