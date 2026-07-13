const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const R2_PUBLIC_URL = "https://pub-09bb561cab274ac2b89ed5f36101dec0.r2.dev";

export function resolveImageUrl(
  storagePath: string,
  width?: number,
  quality?: number,
  resize?: "cover" | "contain" | "fill",
  height?: number
): string {
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }
  // R2 path (wp/2025/10/xxx.jpg) — serve directly
  if (storagePath.startsWith("wp/")) {
    return `${R2_PUBLIC_URL}/${storagePath}`;
  }
  // Supabase Storage: use render endpoint when transform params are given, else raw object URL
  if (width || height || quality) {
    const params = new URLSearchParams();
    if (width) params.set("width", String(width));
    if (height) params.set("height", String(height));
    if (resize) params.set("resize", resize);
    if (quality) params.set("quality", String(quality));
    return `${SUPABASE_URL}/storage/v1/render/image/public/listings/${storagePath}?${params.toString()}`;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/listings/${storagePath}`;
}
