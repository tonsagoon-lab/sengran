import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const {data} = await s.from('categories').select('id, name_th, slug').order('id');
console.log('Supabase categories:');
data.forEach(c => console.log(`  ${c.id}: ${c.name_th} (${c.slug})`));
