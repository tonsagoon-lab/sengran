import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const csv = (name) => parse(readFileSync(join(__dir, name), "utf8"), { columns: true, skip_empty_lines: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// WP term name → Supabase province name mapping (กรณีชื่อต่างกัน)
const NAME_FIX = {
  "กรุงเทพ": "กรุงเทพมหานคร",
};

// โหลด Supabase provinces
const { data: supProvinces } = await s.from("provinces").select("id, name_th");
const supMap = new Map(supProvinces.map((p) => [p.name_th.trim(), p.id]));

// โหลด WP term_id → ชื่อจังหวัด
const termRows = csv("wp_province_terms.csv");
const termMap = new Map(termRows.map((r) => [r.term_id, r.name]));

// โหลด post_id → term_id
const postRows = csv("wp_provinces.csv");
console.log(`Posts with province: ${postRows.length}`);

let updated = 0, skipped = 0;

for (let i = 0; i < postRows.length; i += 50) {
  const batch = postRows.slice(i, i + 50);
  await Promise.all(batch.map(async (row) => {
    const wpName = termMap.get(row.term_id) ?? "";
    const fixedName = NAME_FIX[wpName] ?? wpName;
    const provinceId = supMap.get(fixedName);
    if (!provinceId) { skipped++; return; }

    await s.from("listings")
      .update({ province_id: provinceId })
      .like("slug", `%-wp${row.post_id}`);
    updated++;
  }));

  if ((i + 50) % 500 === 0) console.log(`  ✓ ${i + 50}/${postRows.length}`);
}

console.log(`\n✅ Updated: ${updated}, Skipped: ${skipped}`);
