import { getActiveBanners } from "@/lib/db/listings";
import { BannerSliderClient } from "./banner-slider";

export async function BannerSection() {
  const banners = await getActiveBanners();
  if (banners.length === 0) return null;
  return <BannerSliderClient banners={banners} />;
}
