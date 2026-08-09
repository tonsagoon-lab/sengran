const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const R2_PUBLIC_URL = "https://pub-09bb561cab274ac2b89ed5f36101dec0.r2.dev";

// Transform params kept for API compat but ignored — Pro Plan gives only 100 Storage
// Image Transformations per month, so we serve raw objects (compressed on upload).
export function resolveImageUrl(
  storagePath: string,
  _width?: number,
  _quality?: number,
  _resize?: "cover" | "contain" | "fill",
  _height?: number
): string {
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }
  if (storagePath.startsWith("wp/")) {
    return `${R2_PUBLIC_URL}/${storagePath}`;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/listings/${storagePath}`;
}
