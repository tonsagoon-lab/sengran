import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "a", "h1", "h2", "h3"];
const ALLOWED_ATTR = ["href", "target", "rel"];

/** Sanitize rich-text HTML for safe storage. Server-only (pulls in jsdom via isomorphic-dompurify). */
export function sanitizeRichHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:)/i,
  });
}
