"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

interface RichTextDisplayProps {
  html: string;
  className?: string;
}

export function RichTextDisplay({ html, className }: RichTextDisplayProps) {
  const [clean, setClean] = useState("");

  useEffect(() => {
    // DOMPurify requires browser DOM — run client-side only
    setClean(
      DOMPurify.sanitize(html, {
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
        "prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5",
        "prose-a:text-orange-600 prose-a:no-underline hover:prose-a:underline",
        className ?? "",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

/** Server-safe HTML sanitizer: strips all tags, used before DB save */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
