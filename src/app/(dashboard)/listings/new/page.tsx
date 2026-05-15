import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllCategories, getAllProvinces, getAllAmenities } from "@/lib/db/listings";
import { ListingWizard } from "@/components/listing-wizard";

export const metadata = { title: "ลงประกาศใหม่ — เซ้งร้าน.com" };

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check profile has contact info
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, mobile")
    .eq("id", user.id)
    .single();

  if (!profile?.display_name || !profile?.mobile) {
    redirect("/profile?redirect=/listings/new&reason=missing_contact");
  }

  const [categories, provinces, amenities, config] = await Promise.all([
    getAllCategories(),
    getAllProvinces(),
    getAllAmenities(),
    supabase.from("system_announcement").select("line_package_url, line_faak_url").eq("id", 1).single(),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">ลงประกาศใหม่</h1>
      <ListingWizard
        userId={user.id}
        categories={categories}
        provinces={provinces}
        amenities={amenities}
        linePackageUrl={config.data?.line_package_url ?? undefined}
        lineFaakUrl={config.data?.line_faak_url ?? undefined}
      />
    </main>
  );
}
