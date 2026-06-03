"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Megaphone, MessageCircle, ShieldCheck, Bell, PlusCircle } from "lucide-react";

interface TopMenuBarClientProps {
  unreadCount: number;
  unreadNotifCount: number;
  isAdmin: boolean;
  isLoggedIn: boolean;
}

const LINE_CTA_URL = "https://line.me/R/ti/p/~salebiz";

export function TopMenuBarClient({ unreadCount, unreadNotifCount, isAdmin, isLoggedIn }: TopMenuBarClientProps) {
  const pathname = usePathname();

  function handleNearMe(e: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname === "/") {
      e.preventDefault();
      document.getElementById("near-me")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  const isHome = pathname === "/";
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

        {/* 1. หน้าแรก */}
        <Link href="/" className={linkClass(isHome)} aria-label="หน้าแรก">
          <Home className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">หน้าแรก</span>
        </Link>

        {/* 2. ลงประกาศฟรี — highlighted green */}
        <Link
          href={isLoggedIn ? "/listings/new" : "/login"}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-600 transition-colors whitespace-nowrap"
        >
          <PlusCircle className="h-4 w-4 shrink-0" />
          <span className="sm:hidden">ลงฟรี!</span>
          <span className="hidden sm:inline">ลงประกาศฟรี</span>
        </Link>

        {/* 3. เตือนร้านเซ้งใหม่ — highlighted orange */}
        <Link
          href="/alerts"
          aria-label="เตือนร้านเซ้งใหม่"
          className="relative flex shrink-0 items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors whitespace-nowrap"
        >
          <Bell className="h-4 w-4 shrink-0" />
          <span className="sm:hidden">เตือนเซ้งร้าน</span>
          <span className="hidden sm:inline">เตือนร้านเซ้งใหม่</span>
          {unreadNotifCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
            </span>
          )}
        </Link>

        {/* 4. ลงโฆษณา — highlighted LINE green */}
        <a
          href={LINE_CTA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <Megaphone className="h-4 w-4 shrink-0" />
          <span>ลงโฆษณา</span>
        </a>

        {/* 5. แผนที่เซ้ง */}
        <Link
          href="/map"
          className={linkClass(pathname === "/map")}
          aria-label="แผนที่เซ้ง"
        >
          <Map className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">แผนที่เซ้ง</span>
        </Link>

        {/* 6. ข้อความ */}
        <Link href="/messages" className={`${linkClass(isMessages)} relative`} aria-label="ข้อความ">
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">ข้อความ</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Admin */}
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

      </div>
    </div>
  );
}
