import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// WP slug → Supabase slug mapping
const SLUG_MAP = {
  food:      "restaurant",
  cafe:      "cafe",
  hair:      "salon",
  clinic:    "beauty-clinic",
  minimart:  "minimart",
  wash:      "laundry",
  car:       "car-service",
  talad:     "flea-market",
  alcohal:   "bar-pub",
  other:     "other",
  hotel:     "hotel",
  phamacy:   "pharmacy",
  delivery:  "delivery",
  "%e0%b9%80%e0%b8%8b%e0%b9%89%e0%b8%87%e0%b9%80%e0%b8%89%e0%b8%9e%e0%b8%b2%e0%b8%b0%e0%b8%9e%e0%b8%b7%e0%b9%89%e0%b8%99%e0%b8%97%e0%b8%b5%e0%b9%88": "space-only",
};

// ดึง categories จาก Supabase
const { data: cats } = await s.from("categories").select("id, slug");
const catMap = new Map(cats.map((c) => [c.slug, c.id]));
console.log("Categories loaded:", catMap.size);

// อ่าน CSV
const rows = parse(readFileSync(join(__dir, "wp_listing_cats.csv"), "utf8"), {
  columns: true,
  skip_empty_lines: true,
});
console.log("Rows to process:", rows.length);

// จัด group ตาม post_id (เอา cat แรก)
const postCatMap = new Map();
for (const row of rows) {
  if (!postCatMap.has(row.post_id)) {
    const supabaseSlug = SLUG_MAP[row.cat_slug] ?? "other";
    const catId = catMap.get(supabaseSlug);
    if (catId) postCatMap.set(row.post_id, catId);
  }
}
console.log("Unique post→category mappings:", postCatMap.size);

// อัปเดต listings ทีละ batch
let updated = 0;
const entries = [...postCatMap.entries()];

for (let i = 0; i < entries.length; i += 50) {
  const batch = entries.slice(i, i + 50);
  await Promise.all(
    batch.map(([postId, catId]) =>
      s.from("listings")
        .update({ category_id: catId })
        .like("slug", `%-wp${postId}`)
    )
  );
  updated += batch.length;
  if (updated % 500 === 0) console.log(`  ✓ ${updated}/${entries.length}`);
}

console.log(`\n✅ Updated ${updated} listings with correct categories`);
