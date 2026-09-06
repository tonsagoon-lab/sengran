import { Calendar, Store, Sparkles, Quote } from "lucide-react";
import { getActiveTestimonials, getTotalListingCount } from "@/lib/db/listings";

export async function TrustSection() {
  const [testimonials, totalListings] = await Promise.all([
    getActiveTestimonials(),
    getTotalListingCount(),
  ]);

  const STATS = [
    { icon: Calendar, value: "10+", label: "ปี ให้บริการ" },
    { icon: Store, value: "751+", label: "ร้านเซ้งสำเร็จ" },
    { icon: Sparkles, value: totalListings.toLocaleString("th-TH"), label: "ประกาศมาใหม่ปีนี้" },
  ];

  const quotes = testimonials.slice(0, 5);

  return (
    <section className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="font-semibold text-neutral-800 text-lg">✅ ทำไมต้องเลือกเซ้งร้าน.com</h2>
        <p className="text-sm text-neutral-500">ประสบการณ์กว่า 10 ปี ที่ผู้เซ้งและผู้ซื้อไว้วางใจ</p>
      </div>

      <div className="grid grid-cols-4 gap-2 md:gap-3">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl border bg-gradient-to-br from-orange-50 to-white p-2 md:p-4 text-center space-y-1 md:space-y-1.5"
            >
              <Icon className="h-4 w-4 md:h-6 md:w-6 mx-auto text-orange-500" />
              <p className="text-base md:text-3xl font-bold text-neutral-800 leading-tight">{s.value}</p>
              <p className="text-[10px] md:text-sm text-neutral-600 leading-tight">{s.label}</p>
            </div>
          );
        })}

        {/* Testimonials card — 4th column */}
        {quotes.length > 0 && (
          <div className="rounded-xl border bg-gradient-to-br from-orange-50 to-white p-2 md:p-3 flex flex-col">
            <div className="flex items-center justify-center gap-1 mb-1 md:mb-1.5">
              <Quote className="h-3 w-3 md:h-4 md:w-4 text-orange-500 shrink-0" />
              <p className="text-[10px] md:text-xs font-semibold text-neutral-700">เสียงลูกค้า</p>
            </div>
            <ul className="space-y-0.5 text-center">
              {quotes.map((t) => (
                <li key={t.id} className="text-[9px] md:text-[11px] leading-snug text-neutral-600 truncate">
                  &ldquo;{t.message}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
