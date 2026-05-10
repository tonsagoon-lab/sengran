import { TopMenuBar } from "@/components/top-menu-bar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ข้อกำหนดการใช้งาน — เซ้งร้าน.com",
  description: "ข้อกำหนดและเงื่อนไขการใช้งานเว็บไซต์เซ้งร้าน.com",
};

export default function TermsPage() {
  return (
    <>
      <TopMenuBar />
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <h1 className="text-2xl font-bold text-neutral-900">ข้อกำหนดการใช้งาน</h1>
        <p className="text-xs text-neutral-400">อัปเดตล่าสุด: มกราคม 2568</p>

        <Section title="1. การยอมรับข้อกำหนด">
          การใช้งานเว็บไซต์เซ้งร้าน.com ถือว่าท่านยอมรับข้อกำหนดและเงื่อนไขที่ระบุไว้ทั้งหมด หากท่านไม่ยอมรับ กรุณาหยุดใช้งานเว็บไซต์
        </Section>

        <Section title="2. การลงประกาศ">
          <ul className="list-disc pl-5 space-y-1">
            <li>ผู้ลงประกาศต้องเป็นเจ้าของหรือมีสิทธิ์โอนสิทธิ์ในกิจการนั้นๆ</li>
            <li>ข้อมูลในประกาศต้องเป็นความจริง ไม่บิดเบือนหรือทำให้เข้าใจผิด</li>
            <li>ห้ามลงประกาศซ้ำซ้อนหรือประกาศที่ไม่ใช่ร้านค้า/กิจการ</li>
            <li>เซ้งร้าน.com สงวนสิทธิ์ลบประกาศที่ผิดเงื่อนไขโดยไม่แจ้งล่วงหน้า</li>
          </ul>
        </Section>

        <Section title="3. ความรับผิดชอบ">
          เซ้งร้าน.com เป็นเพียงสื่อกลางในการประกาศ ไม่ใช่คู่สัญญาในการซื้อขาย เซ้ง หรือเช่า ผู้ใช้งานต้องตรวจสอบข้อมูลและดำเนินการด้วยความระมัดระวังของตนเอง
        </Section>

        <Section title="4. การระงับบัญชี">
          เราสงวนสิทธิ์ระงับหรือลบบัญชีที่ฝ่าฝืนข้อกำหนด ใช้งานในทางที่ผิด หรือสร้างความเสียหายแก่ผู้ใช้รายอื่น
        </Section>

        <Section title="5. การเปลี่ยนแปลง">
          เซ้งร้าน.com อาจปรับปรุงข้อกำหนดเหล่านี้ได้ตลอดเวลา การใช้งานต่อเนื่องหลังการแจ้งเปลี่ยนแปลงถือว่ายอมรับข้อกำหนดใหม่
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold text-neutral-800">{title}</h2>
      <div className="text-sm text-neutral-600 leading-relaxed">{children}</div>
    </div>
  );
}
