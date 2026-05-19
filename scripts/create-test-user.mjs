import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase.auth.admin.createUser({
  email: "demo@sengran.com",
  password: "Demo1234!",
  email_confirm: true,
  user_metadata: { display_name: "Demo User" },
});

if (error) {
  console.error("Error:", error.message);
} else {
  console.log("✅ Created:", data.user.email);
}

// อัปเดต profile ให้มีข้อมูลครบ
await supabase.from("profiles").update({
  display_name: "Demo User",
  mobile: "0812345678",
}).eq("id", data.user.id);

console.log("✅ Profile updated");
