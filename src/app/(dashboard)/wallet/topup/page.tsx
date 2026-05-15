import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopupForm } from "@/components/wallet/topup-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "เติม coin — เซ้งร้าน.com" };

export default async function TopupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <TopupForm userId={user.id} />
    </main>
  );
}
