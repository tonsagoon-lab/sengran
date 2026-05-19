const SUPABASE_URL = "https://fexxmtjmrlpitzsjrgbd.supabase.co";
const R2_PUBLIC_URL = "https://pub-09bb561cab274ac2b89ed5f36101dec0.r2.dev";

export function resolveImageUrl(storagePath: string): string {
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }
  if (storagePath.startsWith("wp/")) {
    return `${R2_PUBLIC_URL}/${storagePath}`;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/listings/${storagePath}`;
}
