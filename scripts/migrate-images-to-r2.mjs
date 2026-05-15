/**
 * Migrate images from xn--72ch7bybxexd0cc.com → Cloudflare R2
 * Usage: node scripts/migrate-images-to-r2.mjs
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;

async function fileExists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function downloadAndUpload(url, key) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return key;
}

async function main() {
  // ดึง listing_images ที่ยังเป็น xn--72ch7bybxexd0cc.com URL
  console.log("📦 Fetching images to migrate...");
  // ดึงเฉพาะรูปปี 2026 และ 2025/10-12
  const { data: all } = await supabase
    .from("listing_images")
    .select("id, listing_id, storage_path, display_order")
    .like("storage_path", "%xn--72ch7bybxexd0cc.com%");

  const images = (all ?? []).filter((img) => {
    const url = img.storage_path;
    return (
      url.includes("/2026/") ||
      url.includes("/2025/10/") ||
      url.includes("/2025/11/") ||
      url.includes("/2025/12/")
    );
  });
  const error = null;

  if (error) { console.error(error); process.exit(1); }
  console.log(`  Found ${images.length} images to migrate\n`);

  let done = 0, skipped = 0, failed = 0;

  for (const img of images) {
    const url = img.storage_path;
    // ใช้ path หลัง /uploads/ เป็น key
    const match = url.match(/\/wp-content\/uploads\/(.+)$/);
    if (!match) { skipped++; continue; }
    const key = `wp/${match[1]}`;

    try {
      // ถ้ามีใน R2 แล้วข้ามไป
      if (await fileExists(key)) {
        // อัปเดต URL ใน DB
        await supabase.from("listing_images")
          .update({ storage_path: key })
          .eq("id", img.id);
        done++;
      } else {
        await downloadAndUpload(url, key);
        await supabase.from("listing_images")
          .update({ storage_path: key })
          .eq("id", img.id);
        done++;
      }
    } catch (e) {
      console.log(`  ⚠️  ${url}: ${e.message}`);
      failed++;
    }

    if ((done + failed) % 100 === 0) {
      console.log(`  ✓ ${done} done, ${failed} failed / ${images.length} total`);
    }
  }

  console.log(`\n✅ Done! Migrated: ${done}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch(console.error);
