"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function OAuthCodeHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");

  useEffect(() => {
    if (!code) return;
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(() => {
      // remove code from URL after exchange
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      router.replace(url.pathname + (url.search || ""));
    });
  }, [code]);

  return null;
}
