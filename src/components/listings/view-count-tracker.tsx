"use client";

import { useEffect } from "react";
import { incrementViewCountAction } from "@/lib/actions/listings";

export function ViewCountTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `viewed_${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    incrementViewCountAction(slug).catch(() => {});
  }, [slug]);

  return null;
}
