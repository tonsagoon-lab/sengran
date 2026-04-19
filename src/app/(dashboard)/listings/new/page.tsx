import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllCategories, getAllProvinces } from "@/lib/db/listings";
import { createListingAction } from "@/lib/actions/listings";
import { ListingForm } from "@/components/listings/listing-form";

export const metadata = { title: "ลงประกาศใหม่ — เซ้งร้าน.com" };

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [categories, provinces] = await Promise.all([getAllCategories(), getAllProvinces()]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">ลงประกาศใหม่</h1>
      <ListingForm
        userId={user.id}
        categories={categories}
        provinces={provinces}
        action={createListingAction}
      />
    </main>
  );
}
