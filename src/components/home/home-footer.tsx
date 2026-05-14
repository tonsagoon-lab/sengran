import Link from "next/link";

const LINE_URL = "https://line.me/ti/p/~salebiz";

export function HomeFooter() {
  return (
    <footer className="mt-auto border-t bg-neutral-900 text-neutral-300">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="text-xl font-bold text-white">
              เซ้งร้าน<span className="text-orange-400">.com</span>
            </Link>
            <p className="text-sm leading-relaxed text-neutral-400">
              แพลตฟอร์มซื้อขายร้านค้า เซ้งและให้เช่า ทั่วประเทศไทย
            </p>
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

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">ติดต่อเรา</h3>
            <div className="space-y-2 text-sm text-neutral-400">
              <p>ติดต่อโฆษณา และฝากเซ้งร้าน</p>
              <a
                href={LINE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#06C755] hover:bg-[#05b34c] px-4 py-2 text-sm font-semibold text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                Add Line : salebiz
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-neutral-700 pt-6 text-center text-xs text-neutral-500">
          © 2026 เซ้งร้าน.com — สงวนลิขสิทธิ์
        </div>
      </div>
    </footer>
  );
}
