// lib/format.ts — number, price, and date formatters.
// All Thai-locale aware. Reuse across the whole app — do not inline
// `${listing.sale_price}` strings; always go through priceText().

import type { Listing } from "./types";

const TH_NUM = new Intl.NumberFormat("th-TH");

/** Comma-grouped Thai number: 1234567 → "1,234,567" */
export function fmtTH(n: number): string {
  return TH_NUM.format(n);
}

/** Compact price for tight contexts (map pins): 850000 → "850K", 1200000 → "1.2M" */
export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000)     return Math.round(n / 1_000) + "K";
  return String(n);
}

/**
 * Card / pin price string.
 * - sale:  "฿850,000"
 * - rent:  "฿8,000"
 * - both:  "฿850,000 · เช่า ฿8,000/ด."
 * - empty: "ติดต่อสอบถาม"
 */
export function priceText(l: Pick<Listing, "type" | "sale_price" | "rent_price">): string {
  if (l.type === "sale" && l.sale_price) return `฿${fmtTH(l.sale_price)}`;
  if (l.type === "rent" && l.rent_price) return `฿${fmtTH(l.rent_price)}`;
  if (l.type === "both") {
    const a = l.sale_price ? `฿${fmtTH(l.sale_price)}` : null;
    const b = l.rent_price ? `เช่า ฿${fmtTH(l.rent_price)}/ด.` : null;
    return [a, b].filter(Boolean).join(" · ") || "ติดต่อสอบถาม";
  }
  return "ติดต่อสอบถาม";
}

/** Trailing unit for rent prices (cards): "/เดือน" or "" */
export function priceUnit(l: Pick<Listing, "type">): string {
  return l.type === "rent" ? "/เดือน" : "";
}

/** Compact Thai date: "27 พ.ย. 25" */
const TH_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const month = TH_MONTHS_SHORT[d.getMonth()];
  const year = (d.getFullYear() + 543).toString().slice(-2);  // BE 2-digit
  return `${day} ${month} ${year}`;
}
