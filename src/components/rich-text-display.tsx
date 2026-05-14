"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

interface RichTextDisplayProps {
  html: string;
  className?: string;
}

function toHtml(raw: string): string {
  // Already has HTML tags — sanitize as-is
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  // Plain text — convert newlines to paragraphs
  return raw
    .split(/\n\n+/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function RichTextDisplay({ html, className }: RichTextDisplayProps) {
  const [clean, setClean] = useState("");

  useEffect(() => {
    setClean(
      DOMPurify.sanitize(toHtml(html), {
        ALLOWED_TAGS: ["p", "br", "strong", "em", "ul", "ol", "li", "a"],
        ALLOWED_ATTR: ["href", "target", "rel"],
        FORCE_BODY: true,
      })
    );
  }, [html]);

  return (
    <div
      className={[
        "prose prose-sm max-w-none",
        "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
        "prose-a:text-orange-600 prose-a:no-underline hover:prose-a:underline",
        className ?? "",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

// Re-export for convenience — actual implementation lives in lib/utils/html.ts
export { stripHtmlTags } from "@/lib/utils/html";
