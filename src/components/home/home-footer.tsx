import Link from "next/link";

export function HomeFooter() {
  return (
    <footer className="mt-auto border-t bg-neutral-900 text-neutral-300">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="text-xl font-bold text-white">
              เซ้งร้าน<span className="text-orange-400">.com</span>
            </Link>
            <p className="text-sm leading-relaxed text-neutral-400">
              แพลตฟอร์มซื้อขายร้านค้า เซ้งและให้เช่า ทั่วประเทศไทย
            </p>
          </div>

          {/* Menu */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">เมนู</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-orange-400 transition-colors">หน้าแรก</Link></li>
              <li><Link href="/listings" className="hover:text-orange-400 transition-colors">ดูประกาศ</Link></li>
              <li><Link href="/listings/new" className="hover:text-orange-400 transition-colors">ลงประกาศ</Link></li>
              <li><Link href="/listings?type=sale" className="hover:text-orange-400 transition-colors">ร้านเซ้ง</Link></li>
              <li><Link href="/listings?type=rent" className="hover:text-orange-400 transition-colors">ร้านให้เช่า</Link></li>
            </ul>
          </div>

          {/* Facebook */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">ติดตามเรา</h3>
            <a
              href="https://www.facebook.com/selloutthailand"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm hover:text-orange-400 transition-colors"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </a>
            <div className="mt-2">
              <iframe
                src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fselloutthailand&tabs=timeline&width=300&height=150&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=true"
                width="300"
                height="150"
                style={{ border: "none", overflow: "hidden" }}
                scrolling="no"
                frameBorder={0}
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                title="เซ้งร้าน.com Facebook"
              />
            </div>
          </div>

          {/* Help */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">ช่วยเหลือ</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-orange-400 transition-colors">เกี่ยวกับเรา</Link></li>
              <li><Link href="#" className="hover:text-orange-400 transition-colors">ติดต่อ</Link></li>
              <li><Link href="#" className="hover:text-orange-400 transition-colors">เงื่อนไขการใช้งาน</Link></li>
              <li><Link href="#" className="hover:text-orange-400 transition-colors">นโยบายความเป็นส่วนตัว</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-neutral-700 pt-6 text-center text-xs text-neutral-500">
          © 2026 เซ้งร้าน.com — สงวนลิขสิทธิ์
        </div>
      </div>
    </footer>
  );
}
