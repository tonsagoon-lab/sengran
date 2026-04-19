import { z } from "zod";

export const listingSchema = z
  .object({
    title: z.string().min(5, "กรุณากรอกชื่อประกาศอย่างน้อย 5 ตัวอักษร").max(200),
    description: z.string().min(20, "กรุณากรอกรายละเอียดอย่างน้อย 20 ตัวอักษร"),
    listing_type: z.enum(["sale", "rent", "both"]),
    sale_price: z.string().optional(),
    rent_price: z.string().optional(),
    deposit_months: z.string().optional(),
    price_note: z.string().max(200).optional(),
    category_id: z.string().optional(),
    province_id: z.string().min(1, "กรุณาเลือกจังหวัด"),
    district: z.string().max(100).optional(),
    address: z.string().max(300).optional(),
    area_sqm: z.string().optional(),
    contact_name: z.string().min(2, "กรุณากรอกชื่อผู้ติดต่อ"),
    contact_mobile: z
      .string()
      .min(9, "กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง")
      .regex(/^[0-9+\-\s]+$/, "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง"),
    contact_line: z.string().max(50).optional(),
    video_url: z
      .string()
      .url("URL วิดีโอไม่ถูกต้อง")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.listing_type === "sale" || data.listing_type === "both") {
      if (!data.sale_price || data.sale_price.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "กรุณากรอกราคาขาย",
          path: ["sale_price"],
        });
      } else if (isNaN(Number(data.sale_price)) || Number(data.sale_price) < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ราคาขายต้องเป็นตัวเลขที่มากกว่า 0",
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
  });

export type ListingFormValues = z.infer<typeof listingSchema>;
