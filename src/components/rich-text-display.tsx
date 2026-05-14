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
        "[&_p]:mb-3 [&_p]:leading-relaxed",
        "[&_ul]:mb-3 [&_ol]:mb-3 [&_li]:mb-1",
        "[&_a]:text-orange-600 [&_a]:no-underline hover:[&_a]:underline",
        "text-neutral-700",
        className ?? "",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

// Re-export for convenience — actual implementation lives in lib/utils/html.ts
export { stripHtmlTags } from "@/lib/utils/html";
