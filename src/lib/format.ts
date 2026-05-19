const TH_NUM = new Intl.NumberFormat("th-TH");

export function fmtTH(n: number): string {
  return TH_NUM.format(n);
}

export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "K";
  return String(n);
}

type PriceFields = {
  listing_type: "sale" | "rent" | "both";
  sale_price?: number | null;
  rent_price?: number | null;
};

export function priceText(l: PriceFields): string {
  if (l.listing_type === "sale" && l.sale_price) return `฿${fmtTH(l.sale_price)}`;
  if (l.listing_type === "rent" && l.rent_price) return `฿${fmtTH(l.rent_price)}`;
  if (l.listing_type === "both") {
    const a = l.sale_price ? `฿${fmtTH(l.sale_price)}` : null;
    const b = l.rent_price ? `เช่า ฿${fmtTH(l.rent_price)}/ด.` : null;
    return [a, b].filter(Boolean).join(" · ") || "ติดต่อสอบถาม";
  }
  return "ติดต่อสอบถาม";
}

export function priceUnit(l: PriceFields): string {
  return l.listing_type === "rent" ? "/เดือน" : "";
}

const TH_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${TH_MONTHS_SHORT[d.getMonth()]} ${(d.getFullYear() + 543).toString().slice(-2)}`;
}
