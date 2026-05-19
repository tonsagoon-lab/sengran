"use client";

import { useState, useTransition, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useFavorites(listingId: string) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancel = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", user.id)
        .eq("listing_id", listingId)
        .maybeSingle();
      if (!cancel) setIsFavorited(!!data);
    })();
    return () => { cancel = true; };
  }, [listingId]);

  function toggle() {
    const next = !isFavorited;
    setIsFavorited(next);
    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsFavorited(!next); return; }
      if (next) {
        const { error } = await supabase.from("favorites").insert({ user_id: user.id, listing_id: listingId });
        if (error) setIsFavorited(false);
      } else {
        const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", listingId);
        if (error) setIsFavorited(true);
      }
    });
  }

  return { isFavorited, toggle, isPending };
}
