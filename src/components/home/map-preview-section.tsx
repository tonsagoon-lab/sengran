import { getMapListings } from "@/lib/db/listings";
import { HomepageMapLazy } from "./homepage-map-lazy";

export async function MapPreviewSection() {
  const listings = await getMapListings(0, 150);
  if (listings.length === 0) return null;
  return <HomepageMapLazy listings={listings} />;
}
