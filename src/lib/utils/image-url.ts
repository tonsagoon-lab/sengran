const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";

export function resolveImageUrl(storagePath: string): string {
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }
  // R2 path (wp/2025/10/xxx.jpg)
  if (storagePath.startsWith("wp/") && R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${storagePath}`;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/listings/${storagePath}`;
}
