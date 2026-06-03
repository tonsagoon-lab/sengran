import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getAdminStats() {
  const supabase = createAdminClient();

  const [
    { count: totalListings },
    { count: published },
    { count: sold },
    { count: hidden },
    { count: draft },
    { count: totalUsers },
  ] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "sold"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "hidden"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  // Total views
  const { data: viewData } = await supabase
    .from("listings")
    .select("view_count");
  const totalViews = viewData?.reduce((sum, l) => sum + (l.view_count ?? 0), 0) ?? 0;

  return {
    totalListings: totalListings ?? 0,
    published: published ?? 0,
    sold: sold ?? 0,
    hidden: hidden ?? 0,
    draft: draft ?? 0,
    totalUsers: totalUsers ?? 0,
    totalViews,
  };
}

export async function getNewListingsPerDay(days = 30) {
  const supabase = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from("listings")
    .select("created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  // Group by date
  const map: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    map[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of data ?? []) {
    const key = row.created_at.slice(0, 10);
    if (key in map) map[key] = (map[key] ?? 0) + 1;
  }

  return Object.entries(map).map(([date, count]) => ({ date, count }));
}

export async function getNewUsersPerDay(days = 30) {
  const supabase = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", since.toISOString());

  const map: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    map[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of data ?? []) {
    const key = (row.created_at as string).slice(0, 10);
    if (key in map) map[key] = (map[key] ?? 0) + 1;
  }

  return Object.entries(map).map(([date, count]) => ({ date, count }));
}

export async function getTopListings(limit = 10) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("listings")
    .select("id, title, slug, view_count, status, categories(name_th)")
    .order("view_count", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getListingsByCategory() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("listings")
    .select("category_id, categories(name_th)")
    .eq("status", "published");

  const map: Record<string, { name: string; count: number }> = {};
  for (const row of data ?? []) {
    const id = String(row.category_id);
    const name = (row.categories as unknown as { name_th: string } | null)?.name_th ?? "ไม่ระบุ";
    if (!map[id]) map[id] = { name, count: 0 };
    map[id].count++;
  }
  return Object.values(map).sort((a, b) => b.count - a.count);
}

export async function getListingsByProvince(limit = 10) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("listings")
    .select("province_id, provinces(name_th)")
    .eq("status", "published");

  const map: Record<string, { name: string; count: number }> = {};
  for (const row of data ?? []) {
    const id = String(row.province_id);
    const name = (row.provinces as unknown as { name_th: string } | null)?.name_th ?? "ไม่ระบุ";
    if (!map[id]) map[id] = { name, count: 0 };
    map[id].count++;
  }
  return Object.values(map).sort((a, b) => b.count - a.count).slice(0, limit);
}

export async function getTopSearches(limit = 10) {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("search_logs")
    .select("query")
    .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString());

  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    const q = (row.query as string).toLowerCase();
    map[q] = (map[q] ?? 0) + 1;
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([query, count]) => ({ query, count }));
}

export async function getPageViewsPerDay(days = 30) {
  const supabase = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from("page_views")
    .select("created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  const map: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    map[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of data ?? []) {
    const key = (row.created_at as string).slice(0, 10);
    if (key in map) map[key] = (map[key] ?? 0) + 1;
  }

  return Object.entries(map).map(([date, count]) => ({ date, count }));
}

export async function getTopReferrers(limit = 10) {
  const supabase = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data } = await supabase
    .from("page_views")
    .select("referrer_domain")
    .gte("created_at", since.toISOString())
    .not("referrer_domain", "is", null);

  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    const d = row.referrer_domain as string;
    map[d] = (map[d] ?? 0) + 1;
  }

  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([domain, count]) => ({ domain, count }));
}

export async function getTodayPageViews() {
  const supabase = createAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("page_views")
    .select("id", { count: "exact", head: true })
    .gte("created_at", today.toISOString());

  return count ?? 0;
}

export async function getPendingReports(limit = 100) {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("reports")
    .select("id, reason, detail, status, created_at, listing_id, listings(title, slug)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as {
    id: number;
    reason: string;
    detail: string | null;
    status: "pending" | "reviewed" | "dismissed";
    created_at: string;
    listing_id: string;
    listings: { title: string; slug: string } | null;
  }[];
}

export async function getPendingReportCount() {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

export async function getRecentSold(limit = 10) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("listings")
    .select("id, title, slug, updated_at, categories(name_th), provinces(name_th)")
    .eq("status", "sold")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export const getSiteSetting = unstable_cache(
  async (key: string): Promise<string | null> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .single();
    return (data as { value: string } | null)?.value ?? null;
  },
  ["site_settings"],
  { revalidate: 60, tags: ["site_settings"] }
);

export async function setSiteSetting(key: string, value: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}

