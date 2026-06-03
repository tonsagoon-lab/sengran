"use server";

import { getMapListings } from "@/lib/db/listings";

export async function loadMoreMapListings(offset: number) {
  return getMapListings(offset, 10);
}
