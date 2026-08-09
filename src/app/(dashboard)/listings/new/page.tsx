import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllCategories, getAllProvinces, getAllAmenities } from "@/lib/db/listings";
import { ListingWizard } from "@/components/listing-wizard";
import { ContactInfoDialog } from "@/components/contact-info-dialog";
import { ListingTypeChooser } from "@/components/listing-type-chooser";

export const metadata = { title: "ลงประกาศใหม่ — เซ้งร้าน.com" , robots: { index: false, follow: false } };

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch profile contact info
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, mobile, line_id")
    .eq("id", user.id)
    .single();

  const profileComplete = !!(profile?.display_name && profile?.mobile);

  const [categories, provinces, amenities, config] = await Promise.all([
    getAllCategories(),
    getAllProvinces(),
    getAllAmenities(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("system_announcement").select("line_package_url, line_faak_url, modal_title, modal_subtitle, button_text_package, button_text_faak, button_text_view").eq("id", 1).single() as Promise<{ data: { line_package_url?: string; line_faak_url?: string; modal_title?: string; modal_subtitle?: string; button_text_package?: string; button_text_faak?: string; button_text_view?: string } | null }>,
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {!profileComplete && (
        <ContactInfoDialog
          defaultName={profile?.display_name ?? undefined}
          defaultMobile={profile?.mobile ?? undefined}
          defaultLineId={profile?.line_id ?? undefined}
        />
      )}
      <ListingTypeChooser>
        <h1 className="text-2xl font-bold text-neutral-900 mb-6">ลงประกาศใหม่</h1>
        <ListingWizard
          userId={user.id}
          categories={categories}
          provinces={provinces}
          amenities={amenities}
          linePackageUrl={config.data?.line_package_url ?? undefined}
          lineFaakUrl={config.data?.line_faak_url ?? undefined}
          modalTitle={config.data?.modal_title ?? undefined}
          modalSubtitle={config.data?.modal_subtitle ?? undefined}
          buttonTextPackage={config.data?.button_text_package ?? undefined}
          buttonTextFaak={config.data?.button_text_faak ?? undefined}
          buttonTextView={config.data?.button_text_view ?? undefined}
        />
      </ListingTypeChooser>
    </main>
  );
}
