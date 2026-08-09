import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllCategories, getAllProvinces, getAllAmenities, getListingForEdit, getListingForEditAdmin } from "@/lib/db/listings";
import { ListingWizard } from "@/components/listing-wizard";

export const metadata = { title: "แก้ไขประกาศ — เซ้งร้าน.com" , robots: { index: false, follow: false } };

function isPrivileged(email: string | undefined): boolean {
  if (!email) return false;
  const admin = process.env.ADMIN_EMAIL ?? "";
  const staff = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return email === admin || staff.includes(email);
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const privileged = isPrivileged(user.email ?? undefined);

  const [listing, categories, provinces, amenities, config] = await Promise.all([
    privileged ? getListingForEditAdmin(id) : getListingForEdit(id, user.id),
    getAllCategories(),
    getAllProvinces(),
    getAllAmenities(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("system_announcement").select("line_package_url, line_faak_url, modal_title, modal_subtitle, button_text_package, button_text_faak, button_text_view").eq("id", 1).single() as Promise<{ data: { line_package_url?: string; line_faak_url?: string; modal_title?: string; modal_subtitle?: string; button_text_package?: string; button_text_faak?: string; button_text_view?: string } | null }>,
  ]);

  if (!listing) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">แก้ไขประกาศ</h1>
      <ListingWizard
        userId={user.id}
        categories={categories}
        provinces={provinces}
        amenities={amenities}
        listing={listing}
        linePackageUrl={config.data?.line_package_url ?? undefined}
        lineFaakUrl={config.data?.line_faak_url ?? undefined}
        modalTitle={config.data?.modal_title ?? undefined}
        modalSubtitle={config.data?.modal_subtitle ?? undefined}
        buttonTextPackage={config.data?.button_text_package ?? undefined}
        buttonTextFaak={config.data?.button_text_faak ?? undefined}
        buttonTextView={config.data?.button_text_view ?? undefined}
      />
    </main>
  );
}
