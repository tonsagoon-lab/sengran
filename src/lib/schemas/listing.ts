import { z } from "zod";

export const listingSchema = z
  .object({
    title: z.string().min(5, "กรุณากรอกชื่อประกาศอย่างน้อย 5 ตัวอักษร").max(200),
    description: z.string().min(30, "กรุณากรอกรายละเอียดอย่างน้อย 30 ตัวอักษร"),
    listing_type: z.enum(["sale", "rent", "both"]),
    sale_price: z.string().optional(),
    rent_price: z.string().optional(),
    deposit_months: z.string().optional(),
    price_note: z.string().max(200).optional(),
    revenue_amount: z.string().optional(),
    revenue_period: z.enum(["yearly", "quarterly_avg", "monthly_last"]).optional(),
    category_id: z.string().optional(),
    province_id: z.string().min(1, "กรุณาเลือกจังหวัด"),
    district: z.string().max(100).optional(),
    address: z.string().max(500).optional(),
    area_sqm: z.string().optional(),
    video_url: z
      .string()
      .url("URL วิดีโอไม่ถูกต้อง")
      .optional()
      .or(z.literal("")),
    // lat/lng stored as strings in form state, parsed server-side
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    // Promo: only for listing_type='sale'. Blank promo_type = no promo.
    promo_type: z.enum(["percent", "amount"]).optional(),
    promo_value: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.listing_type === "sale" || data.listing_type === "both") {
      if (!data.sale_price || data.sale_price.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "กรุณากรอกราคาเซ้ง",
          path: ["sale_price"],
        });
      } else if (isNaN(Number(data.sale_price)) || Number(data.sale_price) < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ราคาเซ้งต้องเป็นตัวเลขที่มากกว่า 0",
          path: ["sale_price"],
        });
      }
    }
    if (data.listing_type === "rent" || data.listing_type === "both") {
      if (!data.rent_price || data.rent_price.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "กรุณากรอกราคาเช่า",
          path: ["rent_price"],
        });
      } else if (isNaN(Number(data.rent_price)) || Number(data.rent_price) < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ราคาเช่าต้องเป็นตัวเลขที่มากกว่า 0",
          path: ["rent_price"],
        });
      }
    }
    if (data.promo_type) {
      if (data.listing_type !== "sale") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "โปรโมชั่นใช้ได้เฉพาะประเภทเซ้ง",
          path: ["promo_type"],
        });
      }
      const v = Number(data.promo_value ?? "");
      if (!data.promo_value || isNaN(v) || v <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "กรุณากรอกส่วนลดที่มากกว่า 0",
          path: ["promo_value"],
        });
      } else if (data.promo_type === "percent" && v >= 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "เปอร์เซ็นต์ต้องน้อยกว่า 100",
          path: ["promo_value"],
        });
      } else if (data.promo_type === "amount" && data.sale_price && v >= Number(data.sale_price)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ส่วนลดต้องน้อยกว่าราคาเซ้ง",
          path: ["promo_value"],
        });
      }
    }
  });

export type ListingFormValues = z.infer<typeof listingSchema>;
