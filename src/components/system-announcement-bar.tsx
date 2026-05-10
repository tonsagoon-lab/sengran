import { createAdminClient } from "@/lib/supabase/admin";

const COLOR_MAP: Record<string, string> = {
  orange: "bg-orange-500 text-white",
  blue: "bg-blue-500 text-white",
  green: "bg-green-600 text-white",
  red: "bg-red-500 text-white",
  neutral: "bg-neutral-700 text-white",
};

async function getAnnouncement() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (createAdminClient() as any)
      .from("system_announcement")
      .select("message, is_active, bg_color")
      .eq("id", 1)
      .single();
    return data;
  } catch {
    return null;
  }
}

export async function SystemAnnouncementBar() {
  const ann = await getAnnouncement();
  if (!ann?.is_active || !ann.message) return null;

  const colorClass = COLOR_MAP[ann.bg_color] ?? COLOR_MAP.orange;

  return (
    <div className={`${colorClass} text-center text-sm font-medium px-4 py-2`}>
      {ann.message}
    </div>
  );
}
