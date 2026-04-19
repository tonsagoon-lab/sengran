import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllCategories, getAllProvinces, getListingForEdit } from "@/lib/db/listings";
import { updateListingAction } from "@/lib/actions/listings";
import { ListingForm } from "@/components/listings/listing-form";

export const metadata = { title: "แก้ไขประกาศ — เซ้งร้าน.com" };

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

  const [listing, categories, provinces] = await Promise.all([
    getListingForEdit(id, user.id),
    getAllCategories(),
    getAllProvinces(),
  ]);

  if (!listing) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">แก้ไขประกาศ</h1>
      <ListingForm
        userId={user.id}
        categories={categories}
        provinces={provinces}
        action={updateListingAction}
        listing={listing}
      />
    </main>
  );
}
