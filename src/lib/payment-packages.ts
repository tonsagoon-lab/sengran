export const BOOST_PACKAGES = {
  premium_20: { label: "Premium หน้าแรก 20 วัน", type: "premium" as const, baht: 300, days: 20 },
  premium_40: { label: "Premium หน้าแรก 40 วัน", type: "premium" as const, baht: 500, days: 40 },
  facebook_10: { label: "โฆษณา Facebook 10 วัน", type: "facebook" as const, baht: 1500, days: 10 },
  facebook_20: { label: "โฆษณา Facebook 20 วัน", type: "facebook" as const, baht: 2990, days: 20 },
} as const;

export const QUOTA_PACKAGES = {
  quota_20: { label: "เพิ่ม 20 ประกาศ/ปี", baht: 300, listings: 20 },
  quota_50: { label: "เพิ่ม 50 ประกาศ/ปี", baht: 500, listings: 50 },
  quota_1200: { label: "เพิ่ม 120 ประกาศ/ปี", baht: 1000, listings: 120 },
} as const;

export type BoostPackageKey = keyof typeof BOOST_PACKAGES;
export type QuotaPackageKey = keyof typeof QUOTA_PACKAGES;

export function generateReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "SG-";
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}
