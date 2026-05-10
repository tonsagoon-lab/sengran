import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserAlerts, getAllProvincesForAlert } from "@/lib/db/alerts";
import { getAllCategoriesPublic } from "@/lib/db/listings";
import { AlertForm } from "@/components/alerts/alert-form";
import { AlertCard } from "@/components/alerts/alert-card";
import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { TopMenuBar } from "@/components/top-menu-bar";
import { Button } from "@/components/ui/button";
import { Bell, LogIn } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "การแจ้งเตือน — เซ้งร้าน.com" };

export default async function AlertsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Non-logged-in: show landing instead of redirect
  if (!user) {
    return (
      <>
        <TopMenuBar />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-5">
          <Bell className="h-14 w-14 text-orange-400 mx-auto" />
          <h1 className="text-2xl font-bold text-neutral-900">แจ้งเตือนร้านเซ้ง</h1>
          <p className="text-neutral-500 text-sm max-w-sm mx-auto">
            ตั้งเงื่อนไขจังหวัด ประเภท และราคา แล้วรับแจ้งเตือนทันทีเมื่อมีประกาศใหม่ที่ตรงกับที่คุณสนใจ
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/login">
              <Button className="bg-orange-500 hover:bg-orange-600 gap-2">
                <LogIn className="h-4 w-4" />
                เข้าสู่ระบบเพื่อตั้งแจ้งเตือน
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">สมัครสมาชิกฟรี</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const [alerts, provinces, categories] = await Promise.all([
    getUserAlerts(),
    getAllProvincesForAlert(),
    getAllCategoriesPublic(),
  ]);

  const cats = categories.map((c) => ({ id: c.id, name_th: c.name_th }));

  return (
    <>
      <TopMenuBar />
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-orange-500" />
            <div>
              <h1 className="text-xl font-bold text-neutral-900">แจ้งเตือนร้านเซ้ง</h1>
              <p className="text-sm text-neutral-500">แจ้งเตือนเมื่อมีประกาศใหม่ที่ตรงกับที่คุณสนใจ</p>
            </div>
          </div>
          <AlertForm provinces={provinces} categories={cats} />
        </div>

        {alerts.length === 0 ? (
          <div className="rounded-xl border bg-neutral-50 py-16 text-center space-y-3">
            <Bell className="h-10 w-10 text-neutral-300 mx-auto" />
            <p className="text-neutral-500 text-sm">ยังไม่มีแจ้งเตือนร้านเซ้ง</p>
            <p className="text-xs text-neutral-400">กดปุ่ม "เพิ่มเงื่อนไข" เพื่อเริ่มรับการแจ้งเตือน</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} provinces={provinces} categories={cats} />
            ))}
          </div>
        )}

        {/* Notification inbox */}
        <div className="border-t pt-6">
          <NotificationInbox />
        </div>
      </div>
    </>
  );
}
