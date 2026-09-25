import { Store, Users, Quote } from "lucide-react";
import { getActiveTestimonials, getRecentPageViews } from "@/lib/db/listings";

export async function TrustSection() {
  const [testimonials, recentPageViews] = await Promise.all([
    getActiveTestimonials(),
    getRecentPageViews(),
  ]);

  const STATS: {
    icon: typeof Store;
    value: string;
    label: string;
    href?: string;
  }[] = [
    {
      icon: Store,
      value: "751+",
      label: "ร้านที่เซ้งได้ (โฆษณา)",
      href: "https://www.xn--72ch7bybxexd0cc.com/services",
    },
    { icon: Users, value: recentPageViews.toLocaleString("th-TH"), label: "ผู้ชมเว็บ 30 วัน ล่าสุด" },
  ];

  const quotes = testimonials.slice(0, 5);

  return (
    <section className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="font-semibold text-neutral-800 text-lg">✅ ทำไมต้องเลือกเซ้งร้าน.com</h2>
        <p className="text-sm text-neutral-500">ประสบการณ์กว่า 12 ปี ที่ผู้เซ้งและผู้ซื้อไว้วางใจ</p>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {STATS.map((s) => {
          const Icon = s.icon;
          const cardClass =
            "rounded-xl border bg-gradient-to-br from-orange-50 to-white p-3 md:p-5 text-center space-y-1.5 md:space-y-2";
          const inner = (
            <>
              <Icon className="h-5 w-5 md:h-7 md:w-7 mx-auto text-orange-500" />
              <p className="text-lg md:text-3xl font-bold text-neutral-800 leading-tight">{s.value}</p>
              <p className="text-[11px] md:text-sm text-neutral-600 leading-tight">{s.label}</p>
            </>
          );
          return s.href ? (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${cardClass} block transition-shadow hover:shadow-md hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400`}
            >
              {inner}
            </a>
          ) : (
            <div key={s.label} className={cardClass}>
              {inner}
            </div>
          );
        })}

        {/* Testimonials card — 3rd column */}
        {quotes.length > 0 && (
          <div className="rounded-xl border bg-gradient-to-br from-orange-50 to-white p-3 md:p-4 flex flex-col">
            <div className="flex items-center justify-center gap-1 mb-1.5 md:mb-2">
              <Quote className="h-3.5 w-3.5 md:h-4 md:w-4 text-orange-500 shrink-0" />
              <p className="text-[11px] md:text-xs font-semibold text-neutral-700">เสียงลูกค้า</p>
            </div>
            <ul className="space-y-0.5 md:space-y-1 text-center">
              {quotes.map((t) => (
                <li key={t.id} className="text-[10px] md:text-[11px] leading-snug text-neutral-600 truncate">
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
