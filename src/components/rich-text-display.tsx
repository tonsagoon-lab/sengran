"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

interface RichTextDisplayProps {
  html: string;
  className?: string;
}

const P_STYLE = "margin-top:0;margin-bottom:0.9em;line-height:1.7;";

function toHtml(raw: string): string {
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  return raw
    .split(/\n\n+/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function addInlineStyles(html: string): string {
  // Add inline margin to <p> so no CSS specificity issues
  return html.replace(/<p(\s[^>]*)?>/gi, `<p$1 style="${P_STYLE}">`);
}

export function RichTextDisplay({ html, className }: RichTextDisplayProps) {
  const [clean, setClean] = useState("");

  useEffect(() => {
    const sanitized = DOMPurify.sanitize(toHtml(html), {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "ul", "ol", "li", "a"],
      ALLOWED_ATTR: ["href", "target", "rel", "style"],
      FORCE_BODY: true,
    });
    setClean(addInlineStyles(sanitized));
  }, [html]);

  return (
    <div
      className={["text-sm leading-relaxed text-neutral-700", className ?? ""].join(" ")}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export { stripHtmlTags } from "@/lib/utils/html";
