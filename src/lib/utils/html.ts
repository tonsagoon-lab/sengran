/** Strips all HTML tags, returning plain text. Safe to call from server or client. */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
