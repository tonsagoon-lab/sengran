"use server";

import { extractCoordsFromGoogleMapsUrl, type Coords } from "@/lib/utils/google-maps";

export async function resolveGoogleMapsUrl(url: string): Promise<Coords | null> {
  return extractCoordsFromGoogleMapsUrl(url);
}
