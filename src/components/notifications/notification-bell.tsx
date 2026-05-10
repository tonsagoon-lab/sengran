"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell } from "lucide-react";
import type { Notification } from "@/lib/db/alerts";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function coverUrl(n: Notification) {
  const img = n.listings?.listing_images?.[0];
  if (!img) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/listings/${img.storage_path}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อกี้";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
}

const TYPE_LABELS: Record<string, string> = { sale: "เซ้ง", rent: "เช่า", both: "เซ้ง/เช่า" };

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchData() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const { notifications: n, unreadCount } = await res.json();
      setNotifications(n);
      setUnread(unreadCount);
    } catch { /* ignore */ }
  }

  async function markRead(ids: string[]) {
    if (ids.length === 0) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n));
  }

  // Poll every 60s
  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 60000);
    return () => clearInterval(t);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open) {
      const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
      markRead(unreadIds);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
        title="การแจ้งเตือน"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-semibold text-neutral-800">การแจ้งเตือน</span>
            <Link href="/alerts" onClick={() => setOpen(false)} className="text-xs text-orange-500 hover:underline">
              จัดการเงื่อนไข
            </Link>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y">
            {notifications.length === 0 ? (
              <p className="py-10 text-center text-sm text-neutral-400">ยังไม่มีการแจ้งเตือน</p>
            ) : (
              notifications.map((n) => {
                if (!n.listings) return null;
                const img = coverUrl(n);
                const isUnread = !n.read_at;
                return (
                  <Link
                    key={n.id}
                    href={`/property/${n.listings.slug}`}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors ${isUnread ? "bg-orange-50/50" : ""}`}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                      {img ? (
                        <Image src={img} alt="" fill sizes="48px" className="object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xl">🏪</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 line-clamp-2 leading-snug">
                        {n.listings.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-neutral-400">
                        {n.listings.provinces?.name_th && <span>{n.listings.provinces.name_th}</span>}
                        <span>·</span>
                        <span>{TYPE_LABELS[n.listings.listing_type] ?? ""}</span>
                        <span>·</span>
                        <span>{timeAgo(n.created_at)}</span>
                      </div>
                      {(n.listings.sale_price || n.listings.rent_price) && (
                        <p className="text-xs text-orange-600 font-medium mt-0.5">
                          {n.listings.sale_price ? `${n.listings.sale_price.toLocaleString("th-TH")} บาท` : ""}
                          {n.listings.rent_price ? `${n.listings.rent_price.toLocaleString("th-TH")} บาท/เดือน` : ""}
                        </p>
                      )}
                    </div>

                    {isUnread && <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
