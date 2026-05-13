import { getUnreadMessageCount } from "@/lib/db/messages";
import { getUnreadCount } from "@/lib/db/alerts";
import { createClient } from "@/lib/supabase/server";
import { TopMenuBarClient } from "./top-menu-bar-client";

function isPrivileged(email: string | undefined): boolean {
  if (!email) return false;
  const admin = process.env.ADMIN_EMAIL ?? "";
  const staff = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return email === admin || staff.includes(email);
}

export async function TopMenuBar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [unreadCount, unreadNotifCount] = await Promise.all([
    getUnreadMessageCount(),
    user ? getUnreadCount() : Promise.resolve(0),
  ]);

  return (
    <TopMenuBarClient
      unreadCount={unreadCount}
      unreadNotifCount={unreadNotifCount}
      isAdmin={isPrivileged(user?.email ?? undefined)}
      isLoggedIn={!!user}
    />
  );
}
