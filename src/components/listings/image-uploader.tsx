"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { X, GripVertical, ImagePlus, Loader2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { uploadListingImage, deleteStorageImage, type UploadedImage } from "@/lib/utils/image-upload";
import { deleteListingImageAction } from "@/lib/actions/listings";

interface ExistingImage {
  id: string;
  storage_path: string;
  preview_url: string;
  display_order: number;
}

interface ImageUploaderProps {
  userId: string;
  listingId: string;
  existingImages?: ExistingImage[];
  onImagesChange?: (paths: string[]) => void;
}

interface SortableImageProps {
  id: string;
  src: string;
  onRemove: () => void;
  isFirst?: boolean;
}

function SortableImage({ id, src, onRemove, isFirst }: SortableImageProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group w-28 h-28 shrink-0 rounded-lg overflow-hidden border border-neutral-200"
    >
      <Image src={src} alt="" fill className="object-cover" sizes="112px" />
      {isFirst && (
        <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
          ภาพหลัก
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 bg-black/60 text-white rounded-full p-0.5 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-3 w-3" />
      </div>
    </div>
  );
}

export function ImageUploader({
  userId,
  listingId,
  existingImages = [],
  onImagesChange,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [newImages, setNewImages] = useState<UploadedImage[]>([]);
  const [existing, setExisting] = useState<ExistingImage[]>(existingImages);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const allImages = [
    ...existing.map((img) => ({ id: img.id, src: img.preview_url, isExisting: true })),
    ...newImages.map((img) => ({ id: img.storage_path, src: img.preview_url, isExisting: false })),
  ];

  const notifyChange = useCallback(
    (imgs: typeof newImages) => {
      onImagesChange?.(imgs.map((i) => i.storage_path));
    },
    [onImagesChange]
  );

  async function handleFiles(files: FileList) {
    if (allImages.length + files.length > 7) {
      setUploadError("สามารถอัปโหลดได้สูงสุด 7 รูป");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded: UploadedImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const img = await uploadListingImage(
          files[i],
          userId,
          listingId,
          newImages.length + i
        );
        uploaded.push(img);
      }
      const updated = [...newImages, ...uploaded];
      setNewImages(updated);
      notifyChange(updated);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "อัปโหลดล้มเหลว");
    } finally {
      setUploading(false);
    }
  }

  async function removeExisting(id: string, storagePath: string) {
    await deleteListingImageAction(id, storagePath);
    setExisting((prev) => prev.filter((img) => img.id !== id));
  }

  async function removeNew(storagePath: string) {
    await deleteStorageImage(storagePath);
    const updated = newImages.filter((img) => img.storage_path !== storagePath);
    setNewImages(updated);
    notifyChange(updated);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const allIds = allImages.map((img) => img.id);
    const oldIndex = allIds.indexOf(String(active.id));
    const newIndex = allIds.indexOf(String(over.id));
    const reordered = arrayMove(allImages, oldIndex, newIndex);

    const newExisting: ExistingImage[] = [];
    const newNew: UploadedImage[] = [];

    reordered.forEach((img, idx) => {
      if (img.isExisting) {
        const orig = existing.find((e) => e.id === img.id)!;
        newExisting.push({ ...orig, display_order: idx });
      } else {
        const orig = newImages.find((n) => n.storage_path === img.id)!;
        newNew.push({ ...orig, display_order: idx });
      }
    });

    setExisting(newExisting);
    setNewImages(newNew);
    notifyChange(newNew);
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={allImages.map((img) => img.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex flex-wrap gap-3">
            {allImages.map((img, idx) => (
              <SortableImage
                key={img.id}
                id={img.id}
                src={img.src}
                isFirst={idx === 0}
                onRemove={() => {
                  if (img.isExisting) {
                    const ex = existing.find((e) => e.id === img.id)!;
                    removeExisting(ex.id, ex.storage_path);
                  } else {
                    removeNew(img.id);
                  }
                }}
              />
            ))}

            {allImages.length < 7 && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="w-28 h-28 shrink-0 rounded-lg border-2 border-dashed border-neutral-300 hover:border-orange-400 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:text-orange-500 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-xs">เพิ่มรูป</span>
                  </>
                )}
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {/* Hidden inputs for form submission */}
      {newImages.map((img) => (
        <input
          key={img.storage_path}
          type="hidden"
          name={existingImages.length > 0 ? "new_image_paths[]" : "image_paths[]"}
          value={img.storage_path}
        />
      ))}

      {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
      <p className="text-xs text-neutral-400">
        อัปโหลดได้สูงสุด 7 รูป ({allImages.length}/7) • ลากเพื่อเรียงลำดับ • รูปแรกเป็นภาพหลัก
      </p>
    </div>
  );
}
