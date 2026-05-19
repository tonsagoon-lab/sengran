import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const wpId = process.argv[2] ?? "42948";
const { data: l } = await supabase.from("listings").select("id,slug").like("slug", `%-wp${wpId}`);
console.log("listing:", JSON.stringify(l));
if (l?.[0]) {
  const { data: imgs } = await supabase.from("listing_images").select("id,storage_path,display_order").eq("listing_id", l[0].id);
  console.log("images:", JSON.stringify(imgs));
}
