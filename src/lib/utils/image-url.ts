const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const R2_PUBLIC_URL = "https://pub-09bb561cab274ac2b89ed5f36101dec0.r2.dev";

export function resolveImageUrl(storagePath: string): string {
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }
  // R2 path (wp/2025/10/xxx.jpg)
  if (storagePath.startsWith("wp/")) {
    return `${R2_PUBLIC_URL}/${storagePath}`;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/listings/${storagePath}`;
}
