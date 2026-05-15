import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const {data, error} = await s.from('listings').insert({
  id: crypto.randomUUID(),
  title: 'ทดสอบ',
  slug: 'test-wp99999',
  listing_type: 'sale',
  contact_name: 'ทดสอบ',
  contact_mobile: '0800000000',
  status: 'published',
}).select();
console.log('error:', JSON.stringify(error));
if (!error) await s.from('listings').delete().eq('slug','test-wp99999');
