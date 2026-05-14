"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

interface RichTextDisplayProps {
  html: string;
  className?: string;
}

function toHtml(raw: string): string {
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
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
      className={["prose prose-sm max-w-none", className ?? ""].join(" ")}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export { stripHtmlTags } from "@/lib/utils/html";
