import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const slug = "เซ้งกิจการ-คาเฟ่-ร้านอาห-wp43043";
const { data } = await s.from("listings").select("id, title").eq("slug", slug).single();
console.log(data ? "FOUND: " + data.title : "NOT FOUND");
