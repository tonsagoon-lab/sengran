"use server";

import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

interface Input {
  title: string;
  category_name: string;
  listing_type: "sale" | "rent" | "both";
  sale_price?: string;
  rent_price?: string;
  area_sqm?: string;
  key_features?: string;
  notes?: string;
}

interface Result {
  ok: boolean;
  html?: string;
  error?: string;
}

const SYSTEM_PROMPT = `คุณเป็นคนไทยที่ช่วยเขียนคำอธิบายประกาศเซ้ง/ขาย/ให้เช่าร้านค้าบนแพลตฟอร์ม "เซ้งร้าน.com"

หลักการเขียน:
- ใช้ภาษาไทยเป็นกันเอง สุภาพ ไม่เป็นทางการเกินไป
- ขึ้นต้นด้วยประโยคที่ดึงดูดใจ 1-2 ประโยค
- ใช้ bullet list (<ul><li>) เมื่อระบุจุดเด่นหลายข้อ
- **ห้ามแต่งข้อมูลที่ไม่มีในอินพุต** ถ้าไม่รู้ก็ไม่ต้องเขียน ห้ามเดา
- ไม่ใส่ราคาซ้ำในคำอธิบาย (ผู้ใช้เห็นราคาแยกอยู่แล้ว)
- ไม่ใส่หัวข้อ heading (<h1>-<h6>) ให้ใช้แค่ <p>, <strong>, <em>, <ul>, <ol>, <li>
- ปิดท้ายด้วยประโยคเชิญชวนให้ติดต่อ 1 ประโยค
- ความยาวรวมประมาณ 150-300 คำ

ตอบเป็น HTML ล้วน ไม่ต้องมี markdown, ไม่ต้องมี code fence, ไม่ต้องมีคำอธิบายเพิ่มเติม`;

export async function generateListingDescriptionAction(input: Input): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  const { allowed } = await rateLimit(`ai-desc:${user.id}`, 20, 60 * 60 * 24);
  if (!allowed) return { ok: false, error: "ใช้ AI ครบโควตาวันนี้แล้ว (20 ครั้ง/วัน) ลองใหม่พรุ่งนี้" };

  const typeLabel =
    input.listing_type === "sale" ? "เซ้ง (โอนกิจการ)" :
    input.listing_type === "rent" ? "ให้เช่า" :
    "เซ้งหรือให้เช่า";

  const facts: string[] = [
    `ชื่อประกาศ: ${input.title}`,
    `ประเภท: ${typeLabel}`,
    `หมวดหมู่: ${input.category_name}`,
  ];
  if (input.area_sqm) facts.push(`ขนาดพื้นที่: ${input.area_sqm} ตร.ม.`);
  if (input.key_features) facts.push(`จุดเด่นที่ผู้ประกาศระบุ: ${input.key_features}`);
  if (input.notes) facts.push(`หมายเหตุเพิ่มเติม: ${input.notes}`);

  const userPrompt = `ข้อมูลประกาศ:
${facts.map((f) => `- ${f}`).join("\n")}

เขียนคำอธิบายประกาศเป็น HTML สำหรับประกาศนี้`;

  try {
    const { text } = await generateText({
      model: "anthropic/claude-haiku-4-5",
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.7,
    });

    const html = text.trim()
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    if (!html) return { ok: false, error: "AI ไม่สามารถสร้างคำอธิบายได้ ลองใหม่อีกครั้ง" };

    return { ok: true, html };
  } catch (err) {
    console.error("[ai-description] error:", err);
    return { ok: false, error: "เกิดข้อผิดพลาดในการเรียกใช้ AI ลองใหม่ในอีกสักครู่" };
  }
}
