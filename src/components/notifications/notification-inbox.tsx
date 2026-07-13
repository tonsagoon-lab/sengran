"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, CheckCheck, X } from "lucide-react";
import type { Notification } from "@/lib/db/alerts";
import { Button } from "@/components/ui/button";
import { deleteNotificationAction } from "@/lib/actions/alerts";
import { resolveImageUrl } from "@/lib/utils/image-url";

function coverUrl(n: Notification) {
  const img = n.listings?.listing_images?.[0];
  if (!img) return null;
  return resolveImageUrl(img.storage_path, 96, 65, "cover", 96);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อกี้";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

const TYPE_LABELS: Record<string, string> = { sale: "เซ้ง", rent: "เช่า", both: "เซ้ง/เช่า" };

function formatPrice(n: Notification["listings"]) {
  if (!n) return null;
  if (n.sale_price && n.rent_price) return `เซ้ง ${n.sale_price.toLocaleString("th-TH")} · เช่า ${n.rent_price.toLocaleString("th-TH")}/เดือน`;
  if (n.sale_price) return `${n.sale_price.toLocaleString("th-TH")} บาท`;
  if (n.rent_price) return `${n.rent_price.toLocaleString("th-TH")} บาท/เดือน`;
  return null;
}

export function NotificationInbox() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  async function fetchData() {
    try {
      const res = await fetch("/api/notifications?limit=50");
      if (!res.ok) return;
      const { notifications: n } = await res.json();
      setNotifications(n);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setMarkingAll(true);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setMarkingAll(false);
  }

  async function markOneRead(id: string) {
    if (notifications.find((n) => n.id === id)?.read_at) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }

  async function deleteOne(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotificationAction(id);
  }

  useEffect(() => { fetchData(); }, []);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-neutral-500" />
          <h2 className="text-base font-semibold text-neutral-800">การแจ้งเตือน</h2>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-orange-500 text-[11px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={markingAll}
            className="text-xs text-neutral-500 hover:text-neutral-800 gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            อ่านทั้งหมด
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-white p-3 flex gap-3 animate-pulse">
              <div className="h-16 w-16 rounded-lg bg-neutral-100 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-neutral-100 rounded w-3/4" />
                <div className="h-3 bg-neutral-100 rounded w-1/2" />
                <div className="h-3 bg-neutral-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border bg-neutral-50 py-12 text-center space-y-2">
          <Bell className="h-8 w-8 text-neutral-300 mx-auto" />
          <p className="text-sm text-neutral-400">ยังไม่มีการแจ้งเตือน</p>
          <p className="text-xs text-neutral-400">เมื่อมีประกาศใหม่ที่ตรงเงื่อนไข จะแสดงที่นี่</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            if (!n.listings) return null;
            const img = coverUrl(n);
            const isUnread = !n.read_at;
            const price = formatPrice(n.listings);
            return (
              <Link
                key={n.id}
                href={`/property/${n.listings.slug}`}
                onClick={() => markOneRead(n.id)}
                className={`flex items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-neutral-50 ${
                  isUnread ? "bg-orange-50 border-orange-100" : "bg-white"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                  {img ? (
                    <Image src={img} alt="" fill sizes="64px" className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-2xl">🏪</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 line-clamp-2 leading-snug">
                    {n.listings.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 text-xs text-neutral-400">
                    {n.listings.provinces?.name_th && (
                      <span className="text-neutral-500">{n.listings.provinces.name_th}</span>
                    )}
                    <span>·</span>
                    <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-neutral-600">
                      {TYPE_LABELS[n.listings.listing_type] ?? ""}
                    </span>
                    <span>·</span>
                    <span>{timeAgo(n.created_at)}</span>
                  </div>
                  {price && (
                    <p className="text-xs font-semibold text-orange-600 mt-1">{price}</p>
                  )}
                </div>

                {/* Right side: unread dot + delete */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  {isUnread && <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />}
                  <button
                    onClick={(e) => deleteOne(e, n.id)}
                    className="p-1 rounded-md text-neutral-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                    title="ลบการแจ้งเตือน"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
