import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getEquipmentCategories } from "@/lib/db/equipment";
import { getAllProvinces } from "@/lib/db/listings";
import { EquipmentWizard } from "@/components/equipment/equipment-wizard";
import { TopMenuBar } from "@/components/top-menu-bar";

export const metadata: Metadata = {
  title: "ลงขายอุปกรณ์มือสอง — เซ้งร้าน.com",
  robots: { index: false, follow: false },
};

export default async function NewEquipmentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, mobile")
    .eq("id", user.id)
    .single();

  if (!profile?.display_name || !profile?.mobile) {
    redirect("/profile?reason=missing_contact");
  }

  const [categories, provinces] = await Promise.all([
    getEquipmentCategories(),
    getAllProvinces(),
  ]);

  return (
    <>
      <TopMenuBar />
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <h1 className="text-xl font-bold text-neutral-900 mb-1">ลงขายอุปกรณ์มือสอง</h1>
        <p className="text-sm text-neutral-500 mb-4">
          โพสต์ฟรี ขายได้เร็ว มีผู้ซื้อทั่วประเทศ
        </p>
      </div>
      <EquipmentWizard
        userId={user.id}
        categories={categories}
        provinces={provinces}
      />
    </>
  );
}
