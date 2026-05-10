"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, MapPin, LayoutGrid, Megaphone, ChevronDown, MessageCircle, ShieldCheck, BookOpen, Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Category {
  id: number;
  name_th: string;
  slug: string;
  icon: string | null;
}

interface TopMenuBarClientProps {
  categories: Category[];
  unreadCount: number;
  unreadNotifCount: number;
  isAdmin: boolean;
  isLoggedIn: boolean;
}

const LINE_CTA_URL = "https://line.me/R/ti/p/~salebiz";

export function TopMenuBarClient({ categories, unreadCount, unreadNotifCount, isAdmin, isLoggedIn }: TopMenuBarClientProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleNearMe(e: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname === "/") {
      e.preventDefault();
      document.getElementById("near-me")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  const isHome = pathname === "/";
  const isCategoryActive = pathname.startsWith("/property-type");
  const isMessages = pathname.startsWith("/messages");

  const linkClass = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
      active
        ? "text-orange-600 border-b-2 border-orange-500 rounded-none"
        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
    }`;

  return (
    <div className="border-b bg-gray-50">
      <div className="mx-auto flex h-11 max-w-7xl items-center gap-1 px-4 overflow-x-auto scrollbar-none">

        {/* หน้าแรก */}
        <Link href="/" className={linkClass(isHome)} aria-label="หน้าแรก">
          <Home className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">หน้าแรก</span>
        </Link>

        {/* เซ้งร้านใกล้ฉัน */}
        <a
          href="/#near-me"
          onClick={handleNearMe}
          className={linkClass(false)}
          aria-label="เซ้งร้านใกล้ฉัน"
        >
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">เซ้งร้านใกล้ฉัน</span>
        </a>

        {/* ประเภทร้าน — desktop dropdown */}
        <div className="hidden md:block">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`${linkClass(isCategoryActive)} flex items-center gap-1.5 outline-none`}
            >
              <LayoutGrid className="h-4 w-4 shrink-0" />
              ประเภทร้าน
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {categories.filter((cat) => cat.name_th).map((cat) => (
                <DropdownMenuItem key={cat.id} asChild>
                  <Link href={`/property-type/${cat.slug}`} className="cursor-pointer">
                    {cat.name_th}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/listings" className="cursor-pointer font-medium text-orange-600">
                  ดูทั้งหมด →
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ประเภทร้าน — mobile bottom sheet */}
        <div className="block md:hidden">
          <Sheet>
            <SheetTrigger
              className={`${linkClass(isCategoryActive)} flex items-center gap-1.5 outline-none`}
            >
              <LayoutGrid className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">ประเภทร้าน</span>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>เลือกประเภทร้าน</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-1 pb-6">
                {categories.filter((cat) => cat.name_th).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/property-type/${cat.slug}`}
                    onClick={() => router.push(`/property-type/${cat.slug}`)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-orange-50 hover:text-orange-700"
                  >
                    {cat.name_th}
                  </Link>
                ))}
                <div className="border-t pt-2 mt-2">
                  <Link
                    href="/listings"
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-orange-600 hover:bg-orange-50"
                  >
                    ดูประกาศทั้งหมด →
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* บทความ */}
        <Link href="/blog" className={linkClass(pathname.startsWith("/blog"))} aria-label="บทความ">
          <BookOpen className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">บทความ</span>
        </Link>

        {/* แจ้งเตือนร้านเซ้ง — shown to everyone */}
        <Link
          href="/alerts"
          aria-label="แจ้งเตือนร้านเซ้ง"
          className="relative flex shrink-0 items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors whitespace-nowrap"
        >
          <Bell className="h-4 w-4 shrink-0" />
          <span>แจ้งเตือนร้านเซ้ง</span>
          {unreadNotifCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
            </span>
          )}
        </Link>

        {/* ข้อความ */}
        <Link href="/messages" className={`${linkClass(isMessages)} relative`} aria-label="ข้อความ">
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">ข้อความ</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Admin link — only for admin/staff */}
        {isAdmin && (
          <Link
            href="/admin"
            className={linkClass(pathname.startsWith("/admin"))}
            aria-label="Admin"
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        )}

        {/* LINE CTA */}
        <a
          href={LINE_CTA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-[#00C300] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#00A300] transition-colors whitespace-nowrap"
        >
          <Megaphone className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">ฝากเซ้งร้าน</span>
        </a>

      </div>
    </div>
  );
}
