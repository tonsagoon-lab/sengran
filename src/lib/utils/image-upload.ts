"use client";

import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";

export interface UploadedImage {
  storage_path: string;
  preview_url: string;
  display_order: number;
}

const OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

export async function uploadListingImage(
  file: File,
  userId: string,
  listingId: string,
  order: number
): Promise<UploadedImage> {
  const compressed = await imageCompression(file, OPTIONS);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `${userId}/${listingId}/${filename}`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from("listings")
    .upload(path, compressed, { contentType: file.type, upsert: false });

  if (error) throw new Error(`อัปโหลดรูปภาพล้มเหลว: ${error.message}`);

  const { data: urlData } = supabase.storage.from("listings").getPublicUrl(path);

  return {
    storage_path: path,
    preview_url: urlData.publicUrl,
    display_order: order,
  };
}

export async function deleteStorageImage(storagePath: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from("listings").remove([storagePath]);
}
