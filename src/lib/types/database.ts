export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          mobile: string | null;
          line_id: string | null;
          avatar_url: string | null;
          role: "user" | "admin";
          wallet_balance: number;
          listing_quota: number;
          legacy_wp_user_id: number | null;
          phone_number: string | null;
          phone_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          mobile?: string | null;
          line_id?: string | null;
          avatar_url?: string | null;
          role?: "user" | "admin";
          wallet_balance?: number;
          listing_quota?: number;
          legacy_wp_user_id?: number | null;
          phone_number?: string | null;
          phone_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          mobile?: string | null;
          line_id?: string | null;
          avatar_url?: string | null;
          role?: "user" | "admin";
          wallet_balance?: number;
          listing_quota?: number;
          legacy_wp_user_id?: number | null;
          phone_number?: string | null;
          phone_verified?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: number;
          name_th: string;
          slug: string;
          icon: string | null;
          display_order: number;
          is_active: boolean;
          category_type: "shop" | "equipment";
        };
        Insert: {
          name_th: string;
          slug: string;
          icon?: string | null;
          display_order?: number;
          is_active?: boolean;
          category_type?: "shop" | "equipment";
        };
        Update: {
          name_th?: string;
          slug?: string;
          icon?: string | null;
          display_order?: number;
          is_active?: boolean;
          category_type?: "shop" | "equipment";
        };
        Relationships: [];
      };
      provinces: {
        Row: {
          id: number;
          name_th: string;
          name_en: string;
          slug: string;
          region: string;
        };
        Insert: {
          name_th: string;
          name_en: string;
          slug: string;
          region: string;
        };
        Update: {
          name_th?: string;
          name_en?: string;
          slug?: string;
          region?: string;
        };
        Relationships: [];
      };
      amenities: {
        Row: {
          id: number;
          name_th: string;
          slug: string;
          icon: string | null;
        };
        Insert: {
          name_th: string;
          slug: string;
          icon?: string | null;
        };
        Update: {
          name_th?: string;
          slug?: string;
          icon?: string | null;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          listing_type: "sale" | "rent" | "both" | "equipment";
          sale_price: number | null;
          rent_price: number | null;
          deposit_months: number | null;
          price_note: string | null;
          revenue_amount: number | null;
          revenue_period: "yearly" | "quarterly_avg" | "monthly_last" | null;
          category_id: number | null;
          province_id: number | null;
          district: string | null;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          area_sqm: number | null;
          contact_name: string;
          contact_mobile: string;
          contact_line: string | null;
          video_url: string | null;
          condition: "new" | "used" | null;
          posted_ip: string | null;
          status: "draft" | "published" | "sold" | "expired" | "hidden" | "reserved";
          is_featured: boolean;
          featured_until: string | null;
          boost_until: string | null;
          boost_rank: number;
          view_count: number;
          slug: string;
          published_at: string | null;
          expires_at: string | null;
          legacy_wp_post_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description: string;
          listing_type: "sale" | "rent" | "both" | "equipment";
          sale_price?: number | null;
          rent_price?: number | null;
          deposit_months?: number | null;
          price_note?: string | null;
          revenue_amount?: number | null;
          revenue_period?: "yearly" | "quarterly_avg" | "monthly_last" | null;
          category_id?: number | null;
          province_id?: number | null;
          district?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          area_sqm?: number | null;
          contact_name: string;
          contact_mobile: string;
          contact_line?: string | null;
          video_url?: string | null;
          condition?: "new" | "used" | null;
          posted_ip?: string | null;
          status?: "draft" | "published" | "sold" | "expired" | "hidden" | "reserved";
          is_featured?: boolean;
          featured_until?: string | null;
          boost_until?: string | null;
          boost_rank?: number;
          view_count?: number;
          slug: string;
          published_at?: string | null;
          expires_at?: string | null;
          legacy_wp_post_id?: number | null;
        };
        Update: {
          title?: string;
          description?: string;
          listing_type?: "sale" | "rent" | "both" | "equipment";
          sale_price?: number | null;
          rent_price?: number | null;
          deposit_months?: number | null;
          price_note?: string | null;
          revenue_amount?: number | null;
          revenue_period?: "yearly" | "quarterly_avg" | "monthly_last" | null;
          category_id?: number | null;
          province_id?: number | null;
          district?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          area_sqm?: number | null;
          contact_name?: string;
          contact_mobile?: string;
          contact_line?: string | null;
          video_url?: string | null;
          condition?: "new" | "used" | null;
          posted_ip?: string | null;
          status?: "draft" | "published" | "sold" | "expired" | "hidden" | "reserved";
          is_featured?: boolean;
          featured_until?: string | null;
          boost_until?: string | null;
          boost_rank?: number;
          view_count?: number;
          slug?: string;
          published_at?: string | null;
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "listings_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_province_id_fkey";
            columns: ["province_id"];
            referencedRelation: "provinces";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_images: {
        Row: {
          id: string;
          listing_id: string;
          storage_path: string;
          display_order: number;
          alt_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          storage_path: string;
          display_order?: number;
          alt_text?: string | null;
        };
        Update: {
          display_order?: number;
          alt_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey";
            columns: ["listing_id"];
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_amenities: {
        Row: {
          listing_id: string;
          amenity_id: number;
        };
        Insert: {
          listing_id: string;
          amenity_id: number;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "listing_amenities_listing_id_fkey";
            columns: ["listing_id"];
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: "topup" | "boost" | "feature" | "refund" | "admin_adjust";
          amount: number;
          balance_after: number;
          reference_id: string | null;
          status: "pending" | "completed" | "failed" | "refunded";
          payment_method: string | null;
          payment_ref: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "topup" | "boost" | "feature" | "refund" | "admin_adjust";
          amount: number;
          balance_after: number;
          reference_id?: string | null;
          status?: "pending" | "completed" | "failed" | "refunded";
          payment_method?: string | null;
          payment_ref?: string | null;
          notes?: string | null;
        };
        Update: {
          status?: "pending" | "completed" | "failed" | "refunded";
          notes?: string | null;
        };
        Relationships: [];
      };
      boosts: {
        Row: {
          id: string;
          listing_id: string;
          user_id: string;
          boost_type: "top" | "featured";
          starts_at: string;
          ends_at: string;
          price: number;
          transaction_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          user_id: string;
          boost_type: "top" | "featured";
          starts_at: string;
          ends_at: string;
          price: number;
          transaction_id?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      favorites: {
        Row: {
          user_id: string;
          listing_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          listing_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

// ── Convenience row types ─────────────────────────────────────
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Province = Database["public"]["Tables"]["provinces"]["Row"];
export type Amenity = Database["public"]["Tables"]["amenities"]["Row"];
export type Listing = Database["public"]["Tables"]["listings"]["Row"];
export type ListingImage = Database["public"]["Tables"]["listing_images"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Boost = Database["public"]["Tables"]["boosts"]["Row"];
export type Favorite = Database["public"]["Tables"]["favorites"]["Row"];

export type ListingStatus = Listing["status"];
export type ListingType = Listing["listing_type"];
export type EquipmentCondition = "new" | "used";
