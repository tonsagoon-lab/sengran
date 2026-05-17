import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NavbarClient } from "./navbar-client";
import { NotificationBell } from "@/components/notifications/notification-bell";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-neutral-900 shrink-0">
          เซ้งร้าน<span className="text-orange-500">.com</span>
        </Link>

        {/* Desktop nav */}
        <div className="flex items-center gap-1">
          {user && <NotificationBell />}
          <NavbarClient user={user} profile={profile} />
        </div>
      </div>
    </header>
  );
}
