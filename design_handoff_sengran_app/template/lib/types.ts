// lib/types.ts — TypeScript types matching the Supabase schema.
// Generate the auto types via `supabase gen types typescript` for the
// full set; these are the subsets relevant to the home/browse/detail UI.

export type ListingType = "sale" | "rent" | "both";

export type Category = {
  id: string;
  slug: string;
  name_th: string;
  icon_name: string;  // lucide-react component name (e.g. "UtensilsCrossed")
  sort_order?: number;
};

export type Listing = {
  id: string;
  slug: string;
  title: string;
  type: ListingType;
  category_id: string;
  category?: Category;

  // Pricing — at least one of sale_price/rent_price is required.
  sale_price?: number | null;
  rent_price?: number | null;
  deposit?: number | null;   // months

  // Location
  province:   string;
  district:   string;
  area_label: string;
  latitude?:  number;
  longitude?: number;

  // Media
  image_urls?: string[];   // Supabase Storage URLs

  // Meta
  posted_at: string;       // ISO date
  views?: number;
  featured?: boolean;
  status?: "draft" | "published" | "archived";

  // Seller (joined)
  seller?: {
    user_id: string;
    display_name: string;
    mobile: string;
    line_id: string;
  };

  // Amenities (joined many-to-many)
  amenities?: string[];
};
