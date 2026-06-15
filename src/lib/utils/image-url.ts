const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const R2_PUBLIC_URL = "https://pub-09bb561cab274ac2b89ed5f36101dec0.r2.dev";

export function resolveImageUrl(
  storagePath: string,
  width?: number,
  quality = 65,
  resize: "cover" | "contain" | "fill" = "cover",
  height?: number
): string {
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }
  // R2 path (wp/2025/10/xxx.jpg) — serve directly, no transform needed
  if (storagePath.startsWith("wp/")) {
    return `${R2_PUBLIC_URL}/${storagePath}`;
  }
  // Supabase Storage — use render API for free resize + WebP conversion
  const params = new URLSearchParams({ quality: String(quality), resize });
  if (width) params.set("width", String(width));
  if (height) params.set("height", String(height));
  return `${SUPABASE_URL}/storage/v1/render/image/public/listings/${storagePath}?${params}`;
}
