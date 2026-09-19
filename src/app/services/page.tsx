import type { Metadata } from "next";
import Image from "next/image";
import QRCode from "qrcode";
import { TopMenuBar } from "@/components/top-menu-bar";
import { ExternalLink } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "บริการโฆษณา & ฝากเซ้ง — เซ้งร้าน.com",
  description: "แพ็กเกจโฆษณา Facebook / Kaidee / LivingInsider / TikTok และบริการฝากเซ้งร้าน จ่ายค่านายหน้าเมื่อขายได้ ติดต่อผ่าน LINE",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "บริการโฆษณา & ฝากเซ้ง — เซ้งร้าน.com",
    description: "แพ็กเกจโฆษณาครบทุกช่องทาง และบริการฝากเซ้งร้าน ค่านายหน้า 5%",
  },
};

const LINE_PERSONAL_URL = "https://line.me/ti/p/~salebiz";
const LINE_OA_URL = "https://line.me/R/ti/p/@salebiz";

async function makeQr(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 240,
    color: { dark: "#171717", light: "#ffffff" },
  });
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.365 9.863c.349 0 .63.285.631.63 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
    </svg>
  );
}

export default async function ServicesPage() {
  const [qrPersonal, qrOA] = await Promise.all([
    makeQr(LINE_PERSONAL_URL),
    makeQr(LINE_OA_URL),
  ]);

  return (
    <>
      <TopMenuBar />
      <div className="bg-gradient-to-b from-orange-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-10 space-y-8 md:space-y-12">
          {/* Hero */}
          <section>
            <div className="overflow-hidden rounded-xl md:rounded-2xl shadow-sm">
              <Image
                src="/services/hero.png"
                alt="เซ้งร้าน.com — บริการฝากเซ้งและโฆษณาครบทุกช่องทาง"
                width={2056}
                height={765}
                className="w-full h-auto"
                sizes="(max-width: 768px) 100vw, 1152px"
                priority
                quality={90}
              />
            </div>
          </section>

          {/* Heading */}
          <section className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">
              เลือกบริการที่ตอบโจทย์คุณ
            </h1>
            <p className="text-sm md:text-base text-neutral-600">
              จะซื้อโฆษณาเอง หรือให้เราช่วยขายก็ได้ — เลือกที่ใช่แล้วติดต่อผ่าน LINE เลย
            </p>
          </section>

          {/* Two package cards */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            {/* Package card */}
            <a
              href="#contact"
              className="group block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="relative aspect-[1024/1536] w-full bg-neutral-900">
                <Image
                  src="/services/package.jpeg"
                  alt="แพ็กเกจเซ้งร้านสุดเทพ ระดับ Premium"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 560px"
                  quality={88}
                />
              </div>
              <div className="p-5 md:p-6 space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  📢 แพ็กเกจโฆษณา
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-neutral-900">
                  เริ่มต้น 990.-
                </h2>
                <p className="text-sm text-neutral-600">
                  ยิงโฆษณา Facebook + Kaidee + LivingInsider + TikTok และเว็บประกาศกว่า 50 เว็บ
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 group-hover:text-orange-700">
                    สนใจแพ็กเกจนี้ <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </a>

            {/* ฝากเซ้ง card */}
            <a
              href="#contact"
              className="group block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="relative aspect-[1122/1402] w-full bg-neutral-900">
                <Image
                  src="/services/agent.png"
                  alt="ฝากเซ้ง ขายไว ได้จริง — ค่านายหน้า 5%"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 560px"
                  quality={88}
                />
              </div>
              <div className="p-5 md:p-6 space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                  🏪 บริการฝากเซ้ง
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-neutral-900">
                  ค่าลงทะเบียน 599.- + ค่านายหน้า 5%
                </h2>
                <p className="text-sm text-neutral-600">
                  ทีมเราช่วยขาย ทำสัญญาผ่าน LINE จบใน 1 วัน จ่ายเมื่อขายได้จริงเท่านั้น
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 group-hover:text-orange-700">
                    สนใจฝากเซ้ง <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </a>
          </section>

          {/* Contact — LINE */}
          <section id="contact" className="scroll-mt-20 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900">
                ติดต่อเราผ่าน LINE
              </h2>
              <p className="text-sm md:text-base text-neutral-600">
                สแกน QR หรือกดปุ่มด้านล่างเพื่อเพิ่มเพื่อน สอบถามได้ทันที
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              {/* LINE Personal — recommended */}
              <div className="rounded-2xl border-2 border-green-500 bg-white p-6 md:p-8 shadow-sm space-y-5 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  ⭐ แนะนำ — ช่องทางหลัก
                </div>
                <div>
                  <p className="text-xs text-neutral-500">LINE ID</p>
                  <p className="text-2xl font-bold text-green-600">salebiz</p>
                </div>
                <div
                  className="mx-auto w-40 h-40 md:w-48 md:h-48 [&_svg]:w-full [&_svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: qrPersonal }}
                />
                <a
                  href={LINE_PERSONAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full rounded-full bg-green-500 py-3 text-base font-bold text-white hover:bg-green-600 transition-colors"
                >
                  <LineIcon className="h-5 w-5" />
                  เพิ่มเพื่อน salebiz
                </a>
              </div>

              {/* LINE OA — backup */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 shadow-sm space-y-5 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                  💬 ช่องทางสำรอง
                </div>
                <div>
                  <p className="text-xs text-neutral-500">LINE Official Account</p>
                  <p className="text-2xl font-bold text-neutral-800">@salebiz</p>
                </div>
                <div
                  className="mx-auto w-40 h-40 md:w-48 md:h-48 [&_svg]:w-full [&_svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: qrOA }}
                />
                <a
                  href={LINE_OA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full rounded-full bg-neutral-800 py-3 text-base font-bold text-white hover:bg-neutral-900 transition-colors"
                >
                  <LineIcon className="h-5 w-5" />
                  เพิ่มเพื่อน @salebiz
                </a>
              </div>
            </div>
          </section>

          {/* Footer note */}
          <section className="text-center pb-4">
            <p className="text-xs text-neutral-400">
              เปิดบริการทุกวัน 24 ชั่วโมง · พร้อมติดต่อกลับทันที
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
