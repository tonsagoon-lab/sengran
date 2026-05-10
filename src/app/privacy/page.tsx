import { TopMenuBar } from "@/components/top-menu-bar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว — เซ้งร้าน.com",
  description: "นโยบายความเป็นส่วนตัวและการคุ้มครองข้อมูลส่วนบุคคลตาม PDPA",
};

export default function PrivacyPage() {
  return (
    <>
      <TopMenuBar />
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <h1 className="text-2xl font-bold text-neutral-900">นโยบายความเป็นส่วนตัว</h1>
        <p className="text-xs text-neutral-400">อัปเดตล่าสุด: มกราคม 2568</p>

        <Section title="1. ข้อมูลที่เราเก็บ">
          <ul className="list-disc pl-5 space-y-1">
            <li>อีเมล ชื่อ เบอร์โทรศัพท์ และ LINE ID ที่ท่านกรอกเมื่อสมัครสมาชิกหรือลงประกาศ</li>
            <li>ข้อมูลการใช้งาน เช่น หน้าที่เข้าชม คำค้นหา และการโต้ตอบกับประกาศ</li>
            <li>รูปภาพและเนื้อหาที่ท่านอัปโหลด</li>
          </ul>
        </Section>

        <Section title="2. วัตถุประสงค์การใช้ข้อมูล">
          <ul className="list-disc pl-5 space-y-1">
            <li>แสดงข้อมูลติดต่อในประกาศที่ท่านลงไว้</li>
            <li>ส่งการแจ้งเตือนที่เกี่ยวข้องกับบัญชีหรือประกาศของท่าน</li>
            <li>ปรับปรุงคุณภาพบริการและประสบการณ์ผู้ใช้</li>
          </ul>
        </Section>

        <Section title="3. การเปิดเผยข้อมูล">
          เราไม่ขายหรือให้เช่าข้อมูลส่วนบุคคลของท่านแก่บุคคลภายนอก ข้อมูลติดต่อในประกาศ (ชื่อ เบอร์ LINE) จะแสดงต่อสาธารณะตามที่ท่านเลือก
        </Section>

        <Section title="4. สิทธิ์ของท่านตาม PDPA">
          <ul className="list-disc pl-5 space-y-1">
            <li>สิทธิ์เข้าถึงและขอสำเนาข้อมูลส่วนบุคคล</li>
            <li>สิทธิ์แก้ไขข้อมูลที่ไม่ถูกต้อง</li>
            <li>สิทธิ์ขอลบหรือระงับการใช้ข้อมูล</li>
            <li>สิทธิ์คัดค้านการประมวลผลข้อมูล</li>
          </ul>
          <p className="mt-2">ติดต่อใช้สิทธิ์ได้ที่ LINE: <strong>salebiz</strong></p>
        </Section>

        <Section title="5. การรักษาความปลอดภัย">
          เราใช้บริการ Supabase ที่มีการเข้ารหัสข้อมูลและระบบ Row-Level Security อย่างไรก็ตาม ไม่มีระบบใดที่ปลอดภัย 100% กรุณาดูแลรหัสผ่านของท่านด้วย
        </Section>

        <Section title="6. การเก็บรักษาข้อมูล">
          ข้อมูลบัญชีจะถูกเก็บตลอดที่บัญชียังใช้งานอยู่ ประกาศที่มีอายุเกิน 1 ปีจะถูกลบรูปภาพออกโดยอัตโนมัติ แต่ข้อความยังคงอยู่เพื่อประโยชน์ทาง SEO
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
