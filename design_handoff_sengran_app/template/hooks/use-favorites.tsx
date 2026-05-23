// hooks/use-favorites.tsx — favorite toggle hook with optimistic update.
// Wraps the Supabase mutation. Adapt to whatever data layer the repo
// already uses (server actions, tRPC, useQuery, …) — the public API
// (isFavorited, toggle, isPending) is what callers depend on.

"use client";

import { useState, useTransition, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export function useFavorites(listingId: string) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isPending, startTransition] = useTransition();
  const supabase = createBrowserClient();

  // Hydrate initial state on mount. In real code, prefer fetching the
  // user's full favorites set once at the app level via Context.
  useEffect(() => {
    let cancel = false;
    (async () => {
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
  }, [listingId, supabase]);

  function toggle() {
    const next = !isFavorited;
    setIsFavorited(next);   // optimistic
    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsFavorited(!next);   // revert
        // TODO: route to /login with return_to
        return;
      }
      if (next) {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, listing_id: listingId });
        if (error) setIsFavorited(false);   // revert on failure
      } else {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);
        if (error) setIsFavorited(true);
      }
    });
  }

  return { isFavorited, toggle, isPending };
}
