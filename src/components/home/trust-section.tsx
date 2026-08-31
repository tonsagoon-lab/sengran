import { Calendar, Store, MapPin, BadgeCheck, Quote } from "lucide-react";
import { getActiveTestimonials } from "@/lib/db/listings";

const STATS = [
  { icon: Calendar, value: "10+", label: "ปี ให้บริการ" },
  { icon: Store, value: "751+", label: "ร้านเซ้งสำเร็จ" },
  { icon: MapPin, value: "77", label: "จังหวัดทั่วไทย" },
  { icon: BadgeCheck, value: "100%", label: "ลงประกาศฟรี" },
];

export async function TrustSection() {
  const testimonials = await getActiveTestimonials();

  return (
    <section className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="font-semibold text-neutral-800 text-lg">✅ ทำไมต้องเลือกเซ้งร้าน.com</h2>
        <p className="text-sm text-neutral-500">ประสบการณ์กว่า 10 ปี ที่ผู้เซ้งและผู้ซื้อไว้วางใจ</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl border bg-gradient-to-br from-orange-50 to-white p-4 text-center space-y-1.5"
            >
              <Icon className="h-6 w-6 mx-auto text-orange-500" />
              <p className="text-2xl md:text-3xl font-bold text-neutral-800">{s.value}</p>
              <p className="text-xs md:text-sm text-neutral-600">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Testimonial chips */}
      {testimonials.length > 0 && (
        <div className="rounded-xl border bg-white p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Quote className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-neutral-700">เสียงจากลูกค้าที่ใช้จริง</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {testimonials.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200 px-3 py-1.5 text-sm text-neutral-700"
              >
                &ldquo;{t.message}&rdquo;
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
