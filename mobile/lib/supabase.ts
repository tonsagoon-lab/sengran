import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = "https://fexxmtjmrlpitzsjrgbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZleHhtdGptcmxwaXR6c2pyZ2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MzI4ODIsImV4cCI6MjA1ODEwODg4Mn0.4S3rrCXKq09b97MJQJCjFPu_OFiSp79SJnKbr_fgPj4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
