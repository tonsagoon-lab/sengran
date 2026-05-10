"use client";

import { useRef, useState, useActionState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { updateAvatarAction } from "@/lib/actions/auth";

export function AvatarUploader({ currentUrl, displayName }: { currentUrl: string | null; displayName: string | null }) {
  const [state, formAction, pending] = useActionState(updateAvatarAction, undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  const avatarSrc = preview ?? currentUrl;
  const initials = displayName?.charAt(0).toUpperCase() ?? "?";

  return (
    <form action={formAction} className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="h-20 w-20 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center border-2 border-white shadow">
          {avatarSrc ? (
            <Image src={avatarSrc} alt="avatar" fill className="object-cover" sizes="80px" />
          ) : (
            <span className="text-2xl font-bold text-orange-500">{initials}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white shadow hover:bg-orange-600 transition-colors"
        >
          <Camera className="h-3.5 w-3.5" />
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        name="avatar"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {preview && (
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60 transition-colors"
        >
          {pending ? "กำลังบันทึก..." : "บันทึกรูปโปรไฟล์"}
        </button>
      )}

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="text-xs text-green-600">{state.success}</p>}
    </form>
  );
}
