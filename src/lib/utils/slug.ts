import { createClient } from "@/lib/supabase/server";

export function thaiSlugify(text: string): string {
  let result = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    // Thai unicode block: U+0E00–U+0E7F
    if (code >= 0x0e00 && code <= 0x0e7f) {
      result += char;
    } else if ((code >= 0x61 && code <= 0x7a) || (code >= 0x30 && code <= 0x39)) {
      // a-z or 0-9
      result += char;
    } else if (code >= 0x41 && code <= 0x5a) {
      // A-Z → lowercase
      result += char.toLowerCase();
    } else if (char === " " || char === "-" || char === "_") {
      result += "-";
    }
    // everything else (symbols, punctuation) → skip
  }
  return result
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 120) || "listing";
}

export async function generateUniqueSlug(title: string): Promise<string> {
  const base = thaiSlugify(title);
  const supabase = await createClient();

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt}`;
    const { data } = await supabase
      .from("listings")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }

  return `${base}-${Date.now()}`;
}
