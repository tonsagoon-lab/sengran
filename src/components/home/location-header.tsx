"use client";

import { MapPin, ChevronDown, Bell, MessageCircle } from "lucide-react";
import Link from "next/link";

export function LocationHeader({ location }: { location: string }) {
  return (
    <header className="flex items-center justify-between px-4 pt-2.5 pb-1">
      <div>
        <div className="text-[11px] text-neutral-500">ตำแหน่งปัจจุบัน</div>
        <button className="mt-0.5 flex items-center gap-1.5 text-left">
          <MapPin className="size-4 text-orange-500" />
          <span className="text-base font-bold text-neutral-900">{location}</span>
          <ChevronDown className="size-3.5 text-neutral-500" />
        </button>
      </div>
      <div className="flex items-center">
        <Link
          href="/notifications"
          className="relative grid size-9 place-items-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100"
          aria-label="การแจ้งเตือน"
        >
          <Bell className="size-5" />
          <NotifBadge>3</NotifBadge>
        </Link>
        <Link
          href="/messages"
          className="relative grid size-9 place-items-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100"
          aria-label="ข้อความ"
        >
          <MessageCircle className="size-5" />
          <NotifBadge>1</NotifBadge>
        </Link>
      </div>
    </header>
  );
}

function NotifBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute right-1 top-1 grid min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
      {children}
    </span>
  );
}
