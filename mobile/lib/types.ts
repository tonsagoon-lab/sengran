export type ListingType = "sale" | "rent" | "both";

export type ListingImage = {
  id: string;
  storage_path: string;
  display_order: number;
};

export type Listing = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  listing_type: ListingType;
  sale_price: number | null;
  rent_price: number | null;
  deposit: number | null;
  district: string | null;
  status: string;
  view_count: number;
  published_at: string | null;
  category_id: number | null;
  province_id: number | null;
  latitude: number | null;
  longitude: number | null;
  listing_images: ListingImage[];
  categories: { name_th: string; slug: string } | null;
  provinces: { name_th: string; slug: string } | null;
};

export type ListingDetail = Listing & {
  area_sqm: number | null;
  video_url: string | null;
  profiles: {
    display_name: string | null;
    mobile: string | null;
    line_id: string | null;
    avatar_url: string | null;
  } | null;
};

export type Category = {
  id: number;
  name_th: string;
  slug: string;
};

export type Province = {
  id: number;
  name_th: string;
  slug: string;
};
