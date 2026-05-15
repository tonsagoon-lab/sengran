import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const nineMonthsAgo = new Date();
nineMonthsAgo.setMonth(nineMonthsAgo.getMonth() - 9);

const { data: listings } = await s.from("listings").select("id").gte("published_at", nineMonthsAgo.toISOString());
console.log("Listings in 9 months:", listings.length);

const ids = listings.map(l => l.id);
const { count } = await s.from("listing_images").select("*", {count:"exact", head:true}).like("storage_path", "%sale4biz.com%").in("listing_id", ids);
console.log("Images from sale4biz.com in 9 months:", count);

const { count: total } = await s.from("listing_images").select("*", {count:"exact", head:true}).like("storage_path", "%sale4biz.com%");
console.log("Total images from sale4biz.com:", total);
