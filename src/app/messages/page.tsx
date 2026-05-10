import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyConversations } from "@/lib/db/messages";
import { TopMenuBar } from "@/components/top-menu-bar";
import { MessageCircle, UserCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ข้อความ — เซ้งร้าน.com" };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "เมื่อกี้";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
  return `${Math.floor(hrs / 24)} วันที่แล้ว`;
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conversations = await getMyConversations();

  return (
    <>
      <TopMenuBar />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-bold text-neutral-900 mb-6">ข้อความ</h1>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-neutral-400">
            <MessageCircle className="h-12 w-12" />
            <p className="text-sm">ยังไม่มีข้อความ</p>
          </div>
        ) : (
          <div className="divide-y rounded-xl border bg-white overflow-hidden">
            {conversations.map((conv) => {
              const other = user.id === conv.buyer_id ? conv.seller : conv.buyer;
              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-neutral-50 transition-colors"
                >
                  {other?.avatar_url ? (
                    <img
                      src={other.avatar_url}
                      alt={other.display_name}
                      className="h-11 w-11 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <UserCircle className="h-11 w-11 text-neutral-300 shrink-0" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-neutral-900 truncate">
                        {other?.display_name ?? "ผู้ใช้"}
                      </span>
                      <span className="text-xs text-neutral-400 shrink-0">
                        {timeAgo(conv.updated_at)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {conv.listings?.title ?? "ประกาศที่ถูกลบ"}
                    </p>
                  </div>

                  {(conv.unread_count ?? 0) > 0 && (
                    <span className="shrink-0 h-5 w-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-semibold">
                      {conv.unread_count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
