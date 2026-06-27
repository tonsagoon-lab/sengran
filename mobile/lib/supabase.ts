import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = "https://fexxmtjmrlpitzsjrgbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZleHhtdGptcmxwaXR6c2pyZ2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NjA1OTYsImV4cCI6MjA5MjEzNjU5Nn0.l368H65TQGqOoznVToKTcH_i_BaJGa1QBfNhLIpTqYk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
