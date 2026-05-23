// app/page.tsx — Home (server component)
// Fetches data + composes the layout. Hands off interactive parts to
// <HomeScreen> (client). Renders to the App Router root.
//
// Drop this into `src/app/page.tsx`. Update the existing root page.tsx
// if it already exists — the mobile redesign replaces the home content.

import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { HomeScreen } from "@/components/home/home-screen";
import { HomeSkeleton } from "@/components/home/home-skeleton";
import type { Listing, Category } from "@/lib/types";

// Always fetch fresh — homepage is dynamic content
export const dynamic = "force-dynamic";

async function fetchHomeData() {
  const supabase = createServerClient();

  // Three queries in parallel. All non-blocking — page can still render
  // partial content via Suspense if any one is slow.
  const [catsRes, featRes, latestRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name_th, icon_name")
      .order("sort_order", { ascending: true })
      .limit(8),
    supabase
      .from("listings")
      .select(`
        id, slug, title, type, category_id, image_urls,
        sale_price, rent_price, deposit,
        province, district, area_label, posted_at, featured
      `)
      .eq("featured", true)
      .eq("status", "published")
      .order("posted_at", { ascending: false })
      .limit(6),
    supabase
      .from("listings")
      .select(`
        id, slug, title, type, category_id, image_urls,
        sale_price, rent_price, deposit,
        province, district, area_label, posted_at, featured
      `)
      .eq("status", "published")
      .order("posted_at", { ascending: false })
      .limit(4),
  ]);

  return {
    categories: (catsRes.data ?? []) as Category[],
    featured:   (featRes.data ?? [])   as Listing[],
    latest:     (latestRes.data ?? []) as Listing[],
  };
}

export default async function Page() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeAsync />
    </Suspense>
  );
}

async function HomeAsync() {
  const data = await fetchHomeData();
  return <HomeScreen {...data} />;
}
