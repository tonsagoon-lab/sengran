/**
 * Download WP uploads (past 1 year) via FTP → upload to R2 → update listing_images in DB
 * Usage: node scripts/ftp-to-r2.mjs
 */

import * as ftp from "basic-ftp";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { PassThrough } from "stream";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const BUCKET = process.env.R2_BUCKET;

const TARGET_MONTHS = [
  "2025/05","2025/06","2025/07","2025/08","2025/09",
  "2025/10","2025/11","2025/12",
  "2026/01","2026/02","2026/03","2026/04","2026/05",
];

// thumbnail pattern: filename-123x456.jpg
const THUMBNAIL_RE = /-\d+x\d+\.(jpe?g|png|webp|gif)$/i;
const IMAGE_RE = /\.(jpe?g|png|webp|gif)$/i;

function getContentType(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  return { jpg:"image/jpeg", jpeg:"image/jpeg", png:"image/png", webp:"image/webp", gif:"image/gif" }[ext] ?? "image/jpeg";
}

async function r2Exists(key) {
  try { await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); return true; }
  catch { return false; }
}

// Fetch all broken images with pagination
async function getAllBrokenImages() {
  const all = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("listing_images")
      .select("id, storage_path")
      .like("storage_path", "%xn--72ch7bybxexd0cc.com/wp-content/uploads/%")
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  console.log("📋 Loading broken image URLs from DB...");
  const broken = await getAllBrokenImages();
  console.log(`  Found ${broken.length} images to fix`);
  if (broken.length === 0) { console.log("Nothing to do!"); return; }

  // Map: R2 key → [image_id, ...]
  const keyToIds = new Map();
  for (const img of broken) {
    const match = img.storage_path.match(/\/wp-content\/uploads\/(.+)$/);
    if (!match) continue;
    const key = `wp/${match[1]}`;
    if (!keyToIds.has(key)) keyToIds.set(key, []);
    keyToIds.get(key).push(img.id);
  }
  console.log(`  Unique files needed: ${keyToIds.size}`);

  console.log("\n📡 Connecting to FTP...");
  const client = new ftp.Client(60000);
  client.ftp.verbose = false;
  await client.access({
    host: "27.254.86.99", port: 2121,
    user: "last@xn--72ch7bybxexd0cc.com", password: "last1234", secure: false,
  });
  console.log("  Connected!\n");

  let done = 0, skipped = 0, failed = 0;

  for (const month of TARGET_MONTHS) {
    const remoteDir = `/public_html/wp-content/uploads/${month}`;
    let files;
    try {
      files = await client.list(remoteDir);
    } catch {
      console.log(`  ⚠️  Cannot list ${remoteDir}`);
      continue;
    }

    // Only original images (no thumbnails)
    const originals = files.filter((f) =>
      f.type !== ftp.FileType.Directory &&
      IMAGE_RE.test(f.name) &&
      !THUMBNAIL_RE.test(f.name)
    );

    const needed = originals.filter((f) => keyToIds.has(`wp/${month}/${f.name}`));
    console.log(`📁 ${month}: ${originals.length} originals, ${needed.length} needed`);

    for (const f of needed) {
      const key = `wp/${month}/${f.name}`;
      const ids = keyToIds.get(key) ?? [];

      try {
        if (await r2Exists(key)) {
          // Already in R2 — just update DB
          for (const id of ids) {
            await supabase.from("listing_images").update({ storage_path: key }).eq("id", id);
          }
          done++;
          continue;
        }

        // Download from FTP
        const pass = new PassThrough();
        const chunks = [];
        pass.on("data", (c) => chunks.push(c));
        const finishPromise = new Promise((res, rej) => {
          pass.on("end", res);
          pass.on("error", rej);
        });
        await client.downloadTo(pass, `${remoteDir}/${f.name}`);
        await finishPromise;
        const buffer = Buffer.concat(chunks);

        // Upload to R2
        await r2.send(new PutObjectCommand({
          Bucket: BUCKET, Key: key, Body: buffer, ContentType: getContentType(f.name),
        }));

        // Update DB
        for (const id of ids) {
          await supabase.from("listing_images").update({ storage_path: key }).eq("id", id);
        }

        done++;
        if (done % 20 === 0) console.log(`  ✓ ${done} migrated...`);
      } catch (e) {
        console.log(`  ⚠️  ${f.name}: ${e.message}`);
        failed++;
        // reconnect on FTP error
        try { await client.access({ host:"27.254.86.99",port:2121,user:"last@xn--72ch7bybxexd0cc.com",password:"last1234",secure:false }); }
        catch {}
      }
    }
  }

  client.close();
  console.log(`\n✅ Done! Migrated: ${done}, Skipped (not needed): ${skipped}, Failed: ${failed}`);
}

main().catch(console.error);
