import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Called by Vercel cron daily — see vercel.json
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Reset is_featured for expired boosts
  await supabase
    .from("listings")
    .update({ is_featured: false })
    .eq("is_featured", true)
    .not("featured_until", "is", null)
    .lt("featured_until", now);

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1); // 365 days ago

  // Find listings older than 1 year that still have images
  const { data: expired } = await supabase
    .from("listings")
    .select("id")
    .lt("published_at", cutoff.toISOString())
    .is("images_removed_at", null)
    .eq("status", "published");

  if (!expired || expired.length === 0) {
    return NextResponse.json({ removed: 0 });
  }

  const ids = expired.map((l: { id: string }) => l.id);

  // Fetch image paths to delete from storage
  const { data: images } = await supabase
    .from("listing_images")
    .select("id, storage_path")
    .in("listing_id", ids);

  // Delete from storage
  if (images && images.length > 0) {
    const paths = images.map((img: { storage_path: string }) => img.storage_path);
    await supabase.storage.from("listings").remove(paths);
  }

  // Delete image rows from DB
  await supabase.from("listing_images").delete().in("listing_id", ids);

  // Mark as images removed
  await supabase
    .from("listings")
    .update({ images_removed_at: new Date().toISOString() })
    .in("id", ids);

  return NextResponse.json({ removed: ids.length });
}
