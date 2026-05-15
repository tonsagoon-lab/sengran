import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { count: total } = await s.from("listings").select("*", {count:"exact", head:true}).like("slug", "%-wp%");
const { count: withProvince } = await s.from("listings").select("*", {count:"exact", head:true}).like("slug", "%-wp%").not("province_id", "is", null);

console.log("Total WP listings:", total);
console.log("With province_id:", withProvince);
console.log("Missing province_id:", total - withProvince);
