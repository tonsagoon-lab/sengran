/**
 * Restore deleted WP listing_images from wp_images.csv
 * Usage: node scripts/restore-wp-images.mjs
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: ".env.local" });

const __dir = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("📂 Reading wp_images.csv...");
  const rows = parse(readFileSync(join(__dir, "wp_images.csv"), "utf8"), {
    columns: true,
    skip_empty_lines: true,
  });

  // group by post_id
  const imgMap = new Map();
  for (const row of rows) {
    if (!row.guid || row.guid.includes("localhost")) continue;
    if (!imgMap.has(row.post_id)) imgMap.set(row.post_id, []);
    const list = imgMap.get(row.post_id);
    if (!list.includes(row.guid)) list.push(row.guid);
  }
  console.log(`  Found ${imgMap.size} WP posts with images`);

  // fetch all WP listings from supabase (slug ends with -wp{id}) — paginate to get all
  console.log("🔍 Fetching WP listings from Supabase...");
  const listings = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("listings")
      .select("id, slug")
      .like("slug", "%-wp%")
      .range(from, from + PAGE - 1);
    if (error) { console.error("Error fetching listings:", error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    listings.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`  Found ${listings.length} WP listings in DB`);

  // build map: wpPostId → listingId
  const slugToId = new Map();
  for (const l of listings) {
    const match = l.slug.match(/-wp(\d+)$/);
    if (match) slugToId.set(match[1], l.id);
  }

  let restored = 0, skipped = 0;

  for (const [postId, urls] of imgMap) {
    const listingId = slugToId.get(postId);
    if (!listingId) { skipped++; continue; }

    // check if images already exist for this listing
    const { data: existing } = await supabase
      .from("listing_images")
      .select("id")
      .eq("listing_id", listingId)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue; // already has images, skip
    }

    const { error: insertErr } = await supabase.from("listing_images").insert(
      urls.map((url, idx) => ({
        listing_id: listingId,
        storage_path: url,
        display_order: idx,
      }))
    );

    if (insertErr) {
      console.log(`  ⚠️  post ${postId}: ${insertErr.message}`);
    } else {
      restored++;
      if (restored % 50 === 0) console.log(`  ✓ Restored ${restored}...`);
    }
  }

  console.log(`\n✅ Done! Restored: ${restored}, Skipped: ${skipped}`);
}

main().catch(console.error);
