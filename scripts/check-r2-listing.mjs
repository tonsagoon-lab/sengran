import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await s.from("listings")
  .select("slug, listing_images(storage_path)")
  .like("listing_images.storage_path", "wp/2026/%")
  .not("slug", "like", "%เ%")
  .not("slug", "like", "%า%")
  .limit(3);
console.log(data?.map(d => d.slug));
