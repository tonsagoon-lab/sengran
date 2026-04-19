import { createClient } from "@/lib/supabase/server";

// Map Thai characters to romanized equivalents using Unicode code points
const THAI_MAP: [number, string][] = [
  [0x0e01, "k"], [0x0e02, "k"], [0x0e04, "k"], [0x0e07, "ng"],
  [0x0e08, "j"], [0x0e09, "ch"], [0x0e0a, "ch"], [0x0e0b, "s"],
  [0x0e0d, "y"], [0x0e14, "d"], [0x0e15, "t"], [0x0e16, "t"],
  [0x0e17, "t"], [0x0e19, "n"], [0x0e1a, "b"], [0x0e1b, "p"],
  [0x0e1c, "p"], [0x0e1d, "f"], [0x0e1e, "p"], [0x0e1f, "f"],
  [0x0e20, "p"], [0x0e21, "m"], [0x0e22, "y"], [0x0e23, "r"],
  [0x0e25, "l"], [0x0e27, "w"], [0x0e2a, "s"], [0x0e2b, "h"],
  [0x0e2d, "a"], [0x0e2e, "h"], [0x0e30, "a"], [0x0e32, "a"],
  [0x0e34, "i"], [0x0e35, "i"], [0x0e36, "ue"], [0x0e37, "ue"],
  [0x0e38, "u"], [0x0e39, "u"], [0x0e40, "e"], [0x0e41, "ae"],
  [0x0e42, "o"], [0x0e43, "ai"], [0x0e44, "ai"],
  // Tone marks & silent chars → empty
  [0x0e47, ""], [0x0e48, ""], [0x0e49, ""], [0x0e4a, ""],
  [0x0e4b, ""], [0x0e4c, ""], [0x0e2f, ""],
];

const THAI_LOOKUP = new Map<number, string>(THAI_MAP);

export function thaiSlugify(text: string): string {
  let result = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (THAI_LOOKUP.has(code)) {
      result += THAI_LOOKUP.get(code);
    } else if ((code >= 0x61 && code <= 0x7a) || (code >= 0x30 && code <= 0x39)) {
      // a-z or 0-9
      result += char;
    } else if (code >= 0x41 && code <= 0x5a) {
      // A-Z
      result += char.toLowerCase();
    } else if (char === " " || char === "-" || char === "_") {
      result += "-";
    }
  }
  return result
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80) || "listing";
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
