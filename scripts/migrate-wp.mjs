/**
 * WordPress → Supabase migration script (CSV version)
 *
 * Usage:
 *   node scripts/migrate-wp.mjs
 *
 * Requires CSV files in scripts/:
 *   wp_posts.csv, wp_postmeta.csv, wp_images.csv, wp_users.csv
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: ".env.local" });

const __dir = dirname(fileURLToPath(import.meta.url));
const csv = (name) =>
  parse(readFileSync(join(__dir, name), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });

// ── Supabase admin client ────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getProvinceMap() {
  const { data } = await supabase.from("provinces").select("id, name_th");
  return new Map((data ?? []).map((p) => [p.name_th.trim(), p.id]));
}

async function main() {
  console.log("📂 Reading CSV files...");
  const posts = csv("wp_posts.csv");
  const postmeta = csv("wp_postmeta.csv");
  const images = csv("wp_images.csv");
  const users = csv("wp_users.csv");

  console.log(`  posts: ${posts.length}, postmeta: ${postmeta.length}, images: ${images.length}, users: ${users.length}`);

  // จัด postmeta ตาม post_id
  const metaMap = new Map();
  for (const row of postmeta) {
    if (!metaMap.has(row.post_id)) metaMap.set(row.post_id, {});
    if (row.meta_value) metaMap.get(row.post_id)[row.meta_key] = row.meta_value;
  }

  // จัด images ตาม post_id (deduplicate)
  const imgMap = new Map();
  for (const row of images) {
    if (!row.guid || row.guid.includes("localhost")) continue;
    if (!imgMap.has(row.post_id)) imgMap.set(row.post_id, []);
    const list = imgMap.get(row.post_id);
    if (!list.includes(row.guid)) list.push(row.guid);
  }

  // 1. สร้าง users ใน Supabase Auth
  console.log("\n👥 Migrating users...");
  const userIdMap = new Map(); // wp ID → supabase ID

  for (const user of users) {
    if (!user.user_email || user.user_email === "sale4bizapp@gmail.com") continue;

    const { data: authUser, error } = await supabase.auth.admin.createUser({
      email: user.user_email,
      email_confirm: true,
      user_metadata: { display_name: user.display_name || user.user_login },
    });

    if (error) {
      // ถ้า user มีอยู่แล้ว ดึง ID มาใช้ต่อ
      if (error.message.includes("already been registered") || error.message.includes("already exists")) {
        const { data: existing } = await supabase.auth.admin.listUsers();
        const found = existing?.users?.find((u) => u.email === user.user_email);
        if (found) userIdMap.set(user.ID, found.id);
      } else {
        console.log(`  ⚠️  ${user.user_email}: ${error.message}`);
      }
      continue;
    }

    userIdMap.set(user.ID, authUser.user.id);
    await supabase.from("profiles").upsert({
      id: authUser.user.id,
      display_name: user.display_name || user.user_login,
    });
    console.log(`  ✓ ${user.user_email}`);
  }

  // 2. Import listings
  console.log("\n🏪 Migrating listings...");
  const provinceMap = await getProvinceMap();
  let imported = 0;
  let skipped = 0;

  for (const post of posts) {
    const meta = metaMap.get(post.ID) ?? {};

    const wpProvinceName = meta.fave_property_state ?? "";
    const provinceId = provinceMap.get(wpProvinceName.trim()) ?? null;
    const price = meta.fave_property_price ? parseInt(meta.fave_property_price) : null;
    const lat = meta.houzez_geolocation_lat ? parseFloat(meta.houzez_geolocation_lat) : null;
    const lng = meta.houzez_geolocation_long ? parseFloat(meta.houzez_geolocation_long) : null;
    const contactName = meta.fave_agent_name || "ไม่ระบุ";
    const contactMobile = meta.fave_property_agents_phone || meta.fave_agent_mobile || "ไม่ระบุ";
    const contactLine = meta.fave_agent_line || null;
    let decodedName = post.post_name;
    try { decodedName = decodeURIComponent(post.post_name); } catch {}
    const slug = `${decodedName}-wp${post.ID}`;
    const listingId = crypto.randomUUID();

    const { error } = await supabase.from("listings").insert({
      id: listingId,
      user_id: userIdMap.get(post.post_author) ?? null,
      title: post.post_title,
      description: post.post_content,
      slug,
      listing_type: "sale",
      sale_price: price,
      province_id: provinceId,
      district: meta.fave_property_city ?? null,
      address: meta.fave_property_address ?? null,
      latitude: lat,
      longitude: lng,
      contact_name: contactName,
      contact_mobile: contactMobile,
      contact_line: contactLine,
      status: "published",
      published_at: new Date(post.post_date).toISOString(),
      view_count: 0,
    });

    if (error) {
      console.log(`  ⚠️  ID ${post.ID} "${post.post_title}": ${error.message}`);
      skipped++;
      continue;
    }

    // import รูปภาพ
    const imgs = imgMap.get(post.ID) ?? [];
    if (imgs.length > 0) {
      await supabase.from("listing_images").insert(
        imgs.map((url, idx) => ({
          listing_id: listingId,
          storage_path: url,
          display_order: idx,
        }))
      );
    }

    imported++;
    if (imported % 20 === 0) console.log(`  ✓ ${imported}/${posts.length}`);
  }

  console.log(`\n✅ Done! Imported: ${imported}, Skipped: ${skipped}`);

  // 3. ส่ง password reset email
  console.log("\n📧 Sending password reset emails...");
  for (const [, supabaseId] of userIdMap) {
    const { data: u } = await supabase.auth.admin.getUserById(supabaseId);
    if (u?.user?.email) {
      await supabase.auth.admin.generateLink({ type: "recovery", email: u.user.email });
      console.log(`  ✓ Reset: ${u.user.email}`);
    }
  }

  console.log("\n🎉 Migration complete!");
}

main().catch(console.error);
