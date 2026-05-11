const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export function resolveImageUrl(storagePath: string): string {
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/listings/${storagePath}`;
}
