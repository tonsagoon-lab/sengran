/**
 * WordPress → Supabase migration script
 *
 * Usage:
 *   node scripts/migrate-wp.mjs
 *
 * Requires: npm install mysql2 @supabase/supabase-js dotenv
 * Set MySQL connection info below (from HostingBerry phpMyAdmin)
 */

import mysql from "mysql2/promise";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// ── MySQL config (WordPress DB on HostingBerry) ──────────────────
const MYSQL = {
  host: "localhost",       // หรือ IP ของ HostingBerry
  user: "intherod_wp472",  // ← เปลี่ยนตามจริง
  password: "YOUR_DB_PASSWORD", // ← เปลี่ยน
  database: "intherod_wp472",
  port: 3306,
};

const WP_PREFIX = "wpcc_";
const WP_SITE_URL = "https://xn--72ch7bybxexd0cc.com"; // URL เว็บเก่า

// ── Supabase admin client ────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Province mapping (WordPress province ID → Supabase province ID) ──
// ดึงจาก Supabase
async function getProvinceMap() {
  const { data } = await supabase.from("provinces").select("id, name_th");
  return new Map((data ?? []).map((p) => [p.name_th.trim(), p.id]));
}

// ── Category mapping ─────────────────────────────────────────────
async function getCategoryMap() {
  const { data } = await supabase.from("categories").select("id, name_th, slug");
  return data ?? [];
}

async function main() {
  console.log("🔌 Connecting to MySQL...");
  const db = await mysql.createConnection(MYSQL);

  // 1. ดึง members
  console.log("\n👥 Migrating users...");
  const [members] = await db.execute(
    `SELECT id, email, name, lastname, phone, line FROM ${WP_PREFIX}users
     JOIN ${WP_PREFIX}usermeta ON ${WP_PREFIX}users.ID = ${WP_PREFIX}usermeta.user_id
     WHERE ${WP_PREFIX}usermeta.meta_key = 'wp_capabilities'
     AND ${WP_PREFIX}usermeta.meta_value LIKE '%subscriber%' OR ${WP_PREFIX}usermeta.meta_value LIKE '%author%'
     GROUP BY ${WP_PREFIX}users.ID
     LIMIT 200`
  );

  const userIdMap = new Map(); // wp user ID → supabase user ID

  for (const member of members) {
    if (!member.user_email) continue;

    // สร้าง user ใน Supabase Auth
    const { data: authUser, error } = await supabase.auth.admin.createUser({
      email: member.user_email,
      email_confirm: true,
      user_metadata: {
        display_name: member.display_name || member.user_login,
      },
    });

    if (error) {
      console.log(`  ⚠️  ${member.user_email}: ${error.message}`);
      continue;
    }

    userIdMap.set(member.ID, authUser.user.id);

    // อัปเดต profile
    await supabase.from("profiles").upsert({
      id: authUser.user.id,
      display_name: member.display_name || member.user_login,
    });

    console.log(`  ✓ ${member.user_email}`);
  }

  // 2. ดึง listings (post_type = 'property', status = 'publish')
  console.log("\n🏪 Migrating listings...");
  const provinceMap = await getProvinceMap();

  const [posts] = await db.execute(
    `SELECT ID, post_author, post_title, post_content, post_date, post_name, post_status
     FROM ${WP_PREFIX}posts
     WHERE post_type = 'property' AND post_status = 'publish'
     ORDER BY ID ASC`
  );

  // ดึง postmeta ทั้งหมดมาก่อน
  const [allMeta] = await db.execute(
    `SELECT post_id, meta_key, meta_value
     FROM ${WP_PREFIX}postmeta
     WHERE post_id IN (${posts.map((p) => p.ID).join(",") || "0"})`
  );

  // จัด group postmeta ตาม post_id
  const metaMap = new Map();
  for (const row of allMeta) {
    if (!metaMap.has(row.post_id)) metaMap.set(row.post_id, {});
    metaMap.get(row.post_id)[row.meta_key] = row.meta_value;
  }

  // ดึงรูปภาพ
  const [attachments] = await db.execute(
    `SELECT p.post_parent, p.guid
     FROM ${WP_PREFIX}posts p
     WHERE p.post_type = 'attachment'
     AND p.post_parent IN (${posts.map((p) => p.ID).join(",") || "0"})
     ORDER BY p.ID ASC`
  );

  const imgMap = new Map();
  for (const att of attachments) {
    if (!imgMap.has(att.post_parent)) imgMap.set(att.post_parent, []);
    imgMap.get(att.post_parent).push(att.guid);
  }

  let imported = 0;
  let skipped = 0;

  for (const post of posts) {
    const meta = metaMap.get(post.ID) ?? {};

    // Map province
    const wpProvinceName = meta.fave_property_state ?? "";
    let provinceId = provinceMap.get(wpProvinceName.trim()) ?? null;

    // ราคา
    const price = meta.fave_property_price ? parseInt(meta.fave_property_price) : null;

    // lat/lng
    const lat = meta.houzez_geolocation_lat ? parseFloat(meta.houzez_geolocation_lat) : null;
    const lng = meta.houzez_geolocation_long ? parseFloat(meta.houzez_geolocation_long) : null;

    // contact
    const contactName = meta.fave_agent_name || "ไม่ระบุ";
    const contactMobile = meta.fave_property_agents_phone || meta.fave_agent_mobile || "ไม่ระบุ";
    const contactLine = meta.fave_agent_line || null;

    // slug
    const slug = `${post.post_name}-wp${post.ID}`;

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

    // import รูปภาพ (เก็บ URL เก่าโดยตรง)
    const images = imgMap.get(post.ID) ?? [];
    if (images.length > 0) {
      await supabase.from("listing_images").insert(
        images.map((url, idx) => ({
          listing_id: listingId,
          storage_path: url, // เก็บ URL เต็มจาก WordPress
          display_order: idx,
        }))
      );
    }

    imported++;
    if (imported % 10 === 0) console.log(`  ✓ ${imported}/${posts.length}`);
  }

  console.log(`\n✅ Done! Imported: ${imported}, Skipped: ${skipped}`);

  // 3. ส่ง password reset email ให้ทุก user
  console.log("\n📧 Sending password reset emails...");
  for (const [, supabaseId] of userIdMap) {
    const { data: user } = await supabase.auth.admin.getUserById(supabaseId);
    if (user?.user?.email) {
      await supabase.auth.admin.generateLink({
        type: "recovery",
        email: user.user.email,
      });
      console.log(`  ✓ Reset email: ${user.user.email}`);
    }
  }

  await db.end();
  console.log("\n🎉 Migration complete!");
}

main().catch(console.error);
