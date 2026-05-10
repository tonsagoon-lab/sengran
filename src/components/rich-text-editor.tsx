"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Smile,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Lazy-load emoji picker to avoid SSR issues
import dynamic from "next/dynamic";
const EmojiPicker = dynamic(
  () => import("@emoji-mart/react").then((m) => m.default),
  { ssr: false }
);

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  error?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

const ToolbarButton = ({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    title={title}
    className={cn(
      "p-1.5 rounded hover:bg-neutral-100 transition-colors",
      active && "bg-neutral-200 text-neutral-900"
    )}
  >
    {children}
  </button>
);

export function RichTextEditor({
  value,
  onChange,
  placeholder = "รายละเอียดร้าน...",
  error,
  onImageUpload,
}: RichTextEditorProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiData, setEmojiData] = useState<unknown>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isInit = useRef(false);

  useEffect(() => {
    import("@emoji-mart/data").then((m) => setEmojiData(m.default));
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false, code: false, codeBlock: false, link: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[280px] max-h-[500px] overflow-y-auto px-3 py-2 focus:outline-none",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Sync external value on initial mount only
  useEffect(() => {
    if (editor && !isInit.current && value) {
      editor.commands.setContent(value, { emitUpdate: false });
      isInit.current = true;
    }
  }, [editor, value]);

  function insertLink() {
    const url = window.prompt("URL:");
    if (!url || !editor) return;
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }

  function insertEmoji(emoji: { native: string }) {
    editor?.chain().focus().insertContent(emoji.native).run();
    setEmojiOpen(false);
  }

  async function handleImageFile(file: File) {
    if (!onImageUpload || !editor) return;
    setImageUploading(true);
    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      // ignore
    } finally {
      setImageUploading(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-md border bg-white transition-colors focus-within:ring-1 focus-within:ring-neutral-900",
        error && "border-red-500"
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b px-2 py-1">
        <ToolbarButton
          title="ตัวหนา"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive("bold")}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="ตัวเอียง"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive("italic")}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <div className="w-px h-4 bg-neutral-200 mx-1" />
        <ToolbarButton
          title="รายการ"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive("bulletList")}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="รายการตัวเลข"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive("orderedList")}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <div className="w-px h-4 bg-neutral-200 mx-1" />
        <ToolbarButton title="ลิงก์" onClick={insertLink} active={editor?.isActive("link")}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>

        {onImageUpload && (
          <>
            <div className="w-px h-4 bg-neutral-200 mx-1" />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }}
            />
            <ToolbarButton
              title="แทรกรูปภาพ"
              onClick={() => imageInputRef.current?.click()}
              active={false}
            >
              {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            </ToolbarButton>
          </>
        )}

        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title="อีโมจิ"
              className="p-1.5 rounded hover:bg-neutral-100 transition-colors"
            >
              <Smile className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 border-none w-auto" align="start">
            {emojiData != null && EmojiPicker != null ? (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <EmojiPicker
                data={emojiData as any}
                onEmojiSelect={insertEmoji}
                locale="th"
                theme="light"
                previewPosition="none"
                skinTonePosition="none"
              />
            ) : null}
          </PopoverContent>
        </Popover>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />

      {error && <p className="px-3 pb-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
