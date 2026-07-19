import { TopMenuBar } from "@/components/top-menu-bar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ขอลบบัญชีและข้อมูล — เซ้งร้าน.com",
  description: "วิธีขอลบบัญชีและข้อมูลส่วนบุคคลของท่านจากเว็บไซต์และแอปเซ้งร้าน",
};

export default function DeleteAccountPage() {
  return (
    <>
      <TopMenuBar />
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <h1 className="text-2xl font-bold text-neutral-900">ขอลบบัญชีและข้อมูล</h1>
        <p className="text-sm text-neutral-600 leading-relaxed">
          หน้านี้อธิบายวิธีขอลบบัญชี <strong>เซ้งร้าน</strong> และข้อมูลส่วนบุคคลของท่านทั้งหมด สำหรับผู้ใช้ทั้งบนเว็บไซต์ <strong>เซ้งร้าน.com</strong> และแอปพลิเคชัน <strong>เซ้งร้าน</strong> บน Google Play และ App Store
        </p>

        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          <p className="font-semibold mb-1">ก่อนดำเนินการ</p>
          <p>การลบบัญชีไม่สามารถย้อนกลับได้ ข้อมูลทั้งหมดที่เกี่ยวข้องกับบัญชีของท่านจะถูกลบภายใน 30 วัน กรุณาบันทึกข้อมูลสำคัญที่ท่านต้องการเก็บก่อนส่งคำขอ</p>
        </div>

        <Section title="1. วิธีขอลบบัญชี">
          <p className="mb-3">กรุณาส่งคำขอลบบัญชีผ่านช่องทางใดช่องทางหนึ่งต่อไปนี้:</p>
          <div className="space-y-3">
            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="font-semibold text-neutral-900 mb-1">ช่องทางที่ 1: LINE Official Account</p>
              <p className="text-sm">แอด LINE ID: <strong>@sale4biz</strong></p>
              <p className="text-sm mt-1">พิมพ์ข้อความ &ldquo;ขอลบบัญชี&rdquo; พร้อมระบุ<strong>อีเมลที่ใช้สมัคร</strong></p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="font-semibold text-neutral-900 mb-1">ช่องทางที่ 2: อีเมล</p>
              <p className="text-sm">ส่งอีเมลถึง: <strong>sale4bizapp@gmail.com</strong></p>
              <p className="text-sm mt-1">หัวเรื่อง: <em>ขอลบบัญชีเซ้งร้าน</em></p>
              <p className="text-sm">เนื้อความ: ระบุ<strong>อีเมลที่ใช้สมัคร</strong>และ<strong>ชื่อในโปรไฟล์</strong></p>
            </div>
          </div>
        </Section>

        <Section title="2. ข้อมูลที่จะถูกลบ">
          <ul className="list-disc pl-5 space-y-1">
            <li>ข้อมูลบัญชี — อีเมล ชื่อ เบอร์โทรศัพท์ LINE ID และรหัสผ่าน</li>
            <li>ประกาศทั้งหมดของท่าน — ชื่อร้าน ราคา คำอธิบาย ที่อยู่ พิกัด GPS</li>
            <li>รูปภาพประกาศทั้งหมดที่ท่านอัปโหลด</li>
            <li>รายการโปรด (ประกาศที่ท่านกดหัวใจไว้)</li>
            <li>ประวัติการเข้าชมและกิจกรรมในแอป</li>
          </ul>
        </Section>

        <Section title="3. ข้อมูลที่อาจถูกเก็บต่อ">
          <p className="mb-2">เราอาจเก็บข้อมูลบางส่วนต่อตามที่กฎหมายกำหนด:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>บันทึกการทำธุรกรรม (ถ้ามี) — เก็บ 5 ปีตามกฎหมายภาษี</li>
            <li>บันทึกความปลอดภัย (Security logs) — เก็บ 12 เดือน เพื่อป้องกันการหลอกลวง</li>
            <li>ข้อมูลที่จำเป็นต่อการดำเนินคดี (ถ้ามีข้อพิพาทค้างอยู่)</li>
          </ul>
          <p className="mt-2 text-xs text-neutral-500">ข้อมูลเหล่านี้จะถูกทำให้ไม่สามารถระบุตัวตนได้ (anonymized) ทันทีที่พ้นข้อกำหนดทางกฎหมาย</p>
        </Section>

        <Section title="4. ระยะเวลาดำเนินการ">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>ภายใน 3 วันทำการ:</strong> เราจะยืนยันการรับคำขอผ่านช่องทางที่ท่านติดต่อมา</li>
            <li><strong>ภายใน 30 วัน:</strong> ข้อมูลของท่านจะถูกลบออกจากระบบทั้งหมด (ยกเว้นข้อมูลที่กฎหมายกำหนดให้เก็บ)</li>
            <li><strong>ภายใน 90 วัน:</strong> ข้อมูลใน backup จะถูกลบตามรอบการหมุนเวียน backup</li>
          </ul>
        </Section>

        <Section title="5. หากต้องการเก็บบัญชีไว้แต่ลบเฉพาะข้อมูลบางส่วน">
          <p>
            ท่านไม่จำเป็นต้องลบบัญชีทั้งหมด หากต้องการเพียง:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>ลบประกาศ:</strong> เข้าไปที่ &ldquo;ประกาศของฉัน&rdquo; และกดลบประกาศแต่ละรายการเองได้</li>
            <li><strong>แก้ไขข้อมูลโปรไฟล์:</strong> เข้าไปที่หน้า &ldquo;โปรไฟล์&rdquo; และแก้ไขได้ทันที</li>
            <li><strong>ปิดการแจ้งเตือน:</strong> ปิดในตั้งค่าเครื่อง (Notifications)</li>
          </ul>
        </Section>

        <Section title="6. สอบถามเพิ่มเติม">
          <ul className="list-disc pl-5 space-y-1">
            <li>LINE: <strong>@sale4biz</strong></li>
            <li>อีเมล: <strong>sale4bizapp@gmail.com</strong></li>
            <li>เว็บไซต์: <strong>เซ้งร้าน.com</strong></li>
          </ul>
        </Section>

        <p className="text-xs text-neutral-400 pt-6 border-t border-neutral-100">
          หน้านี้เป็นส่วนหนึ่งของ <a href="/privacy" className="underline hover:text-orange-600">นโยบายความเป็นส่วนตัว</a> ของเซ้งร้าน
        </p>
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
