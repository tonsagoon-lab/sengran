const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const R2_PUBLIC_URL = "https://pub-09bb561cab274ac2b89ed5f36101dec0.r2.dev";

export function resolveImageUrl(
  storagePath: string,
  width?: number,
  quality?: number,
  resize?: "cover" | "contain" | "fill",
  height?: number
): string {
  // Suppress unused-parameter warnings — kept for call-site compatibility
  void width; void quality; void resize; void height;

  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }
  // R2 path (wp/2025/10/xxx.jpg) — serve directly
  if (storagePath.startsWith("wp/")) {
    return `${R2_PUBLIC_URL}/${storagePath}`;
  }
  // Supabase Storage — use direct public URL (image transformation not enabled)
  return `${SUPABASE_URL}/storage/v1/object/public/listings/${storagePath}`;
}
