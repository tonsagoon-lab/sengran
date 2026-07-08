import DOMPurify from "isomorphic-dompurify";

/** Strips all HTML tags, returning plain text. Safe to call from server or client. */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "a", "h1", "h2", "h3"];
const ALLOWED_ATTR = ["href", "target", "rel"];

/** Sanitize rich-text HTML for safe storage. Safe on server (Node) and client. */
export function sanitizeRichHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:)/i,
  });
}
