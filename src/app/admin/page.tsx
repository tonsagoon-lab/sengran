import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminStats,
  getTopListings,
  getListingsByCategory,
  getListingsByProvince,
  getTopSearches,
  getRecentSold,
  getPageViewsPerDay,
  getTopReferrers,
  getTodayPageViews,
  getPendingReports,
  getPendingReportCount,
} from "@/lib/db/admin";
import { TopMenuBar } from "@/components/top-menu-bar";
import { ChartSection } from "@/components/admin/chart-section";
import { PageViewsChart } from "@/components/admin/pageviews-chart";
import { PicksManager } from "@/components/admin/picks-manager";
import { ContentManager } from "@/components/admin/content-manager";
import { SiteSettings } from "@/components/admin/site-settings";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { ArticlesManager } from "@/components/admin/articles-manager";
import { ReportsManager } from "@/components/admin/reports-manager";
import {
  LayoutGrid, Users, Eye,
  FileText, CheckCircle, EyeOff, FileEdit, TrendingUp, Globe,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Dashboard — เซ้งร้าน.com" };

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const STAFF_EMAILS = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
function isPrivileged(email: string | undefined) {
  if (!email) return false;
  return email === ADMIN_EMAIL || STAFF_EMAILS.includes(email);
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-full flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-neutral-900">{typeof value === "number" ? value.toLocaleString("th-TH") : value}</p>
        <p className="text-sm text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

function MiniBar({ items, max }: { items: { label: string; count: number }[]; max: number }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="space-y-0.5">
          <div className="flex justify-between text-xs text-neutral-600">
            <span className="truncate max-w-[70%]">{item.label}</span>
            <span className="font-medium">{item.count.toLocaleString("th-TH")}</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-orange-400"
              style={{ width: `${max > 0 ? (item.count / max) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}


export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isPrivileged(user.email ?? undefined)) redirect("/");
  const isAdmin = user.email === ADMIN_EMAIL;
  const isStaffOnly = !isAdmin && STAFF_EMAILS.includes(user.email ?? "");
  const { tab } = await searchParams;
  const activeTab = tab === "settings" ? "settings" : tab === "articles" ? "articles" : tab === "reports" ? "reports" : "dashboard";

  const [
    stats,
    topListings,
    byCategory,
    byProvince,
    topSearches,
    recentSold,
    pageViewsPerDay,
    topReferrers,
    todayViews,
    allReports,
    pendingReportCount,
  ] = await Promise.all([
    getAdminStats(),
    getTopListings(10),
    getListingsByCategory(),
    getListingsByProvince(10),
    getTopSearches(10),
    getRecentSold(10),
    getPageViewsPerDay(30),
    getTopReferrers(10),
    getTodayPageViews(),
    getPendingReports(),
    getPendingReportCount(),
  ]);

  const maxCat = Math.max(...byCategory.map((c) => c.count), 1);
  const maxProv = Math.max(...byProvince.map((p) => p.count), 1);
  const maxSearch = Math.max(...topSearches.map((s) => s.count), 1);

  return (
    <>
      <TopMenuBar />
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">Admin</h1>
        </div>

        {/* ── Staff view — listings only ───────────────────── */}
        {isStaffOnly && <ContentManager isAdmin={false} />}

        {/* ── Admin-only below ─────────────────────────────── */}
        {!isStaffOnly && <>
        {/* Tab bar */}
        <AdminTabs pendingReports={pendingReportCount} />

        {/* ── Reports tab ──────────────────────────────────── */}
        {activeTab === "reports" && <ReportsManager initialReports={allReports} />}

        {/* ── Articles tab ─────────────────────────────────── */}
        {activeTab === "articles" && <ArticlesManager />}

        {/* ── Settings tab ─────────────────────────────────── */}
        {activeTab === "settings" && isAdmin && <SiteSettings />}
        {activeTab === "settings" && !isAdmin && (
          <p className="text-sm text-neutral-500">คุณไม่มีสิทธิ์เข้าถึงส่วนนี้</p>
        )}

        {/* ── Dashboard tab ────────────────────────────────── */}
        {activeTab === "dashboard" && (<>
        {/* Overview cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard label="ประกาศทั้งหมด" value={stats.totalListings} icon={LayoutGrid} color="bg-orange-500" />
          <StatCard label="เผยแพร่แล้ว" value={stats.published} icon={FileText} color="bg-green-500" />
          <StatCard label="ขายแล้ว" value={stats.sold} icon={CheckCircle} color="bg-blue-500" />
          <StatCard label="ซ่อนอยู่" value={stats.hidden} icon={EyeOff} color="bg-neutral-400" />
          <StatCard label="แบบร่าง" value={stats.draft} icon={FileEdit} color="bg-yellow-500" />
          <StatCard label="ผู้ใช้ทั้งหมด" value={stats.totalUsers} icon={Users} color="bg-purple-500" />
          <StatCard label="ยอดวิวรวม" value={stats.totalViews} icon={Eye} color="bg-pink-500" />
          <StatCard label="คนเข้าวันนี้" value={todayViews} icon={TrendingUp} color="bg-teal-500" />
        </div>

        {/* Traffic section */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Page views chart — interactive */}
          <PageViewsChart initialData={pageViewsPerDay} initialDays={30} />

          {/* Top referrers */}
          <div className="rounded-xl border bg-white p-5">
            <h2 className="text-sm font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              คนมาจากเว็บไหน (30 วัน)
            </h2>
            {topReferrers.length === 0 ? (
              <p className="text-sm text-neutral-400 py-6 text-center">ยังไม่มีข้อมูล</p>
            ) : (
              <MiniBar
                items={topReferrers.map((r) => ({ label: r.domain, count: r.count }))}
                max={Math.max(...topReferrers.map((r) => r.count), 1)}
              />
            )}
          </div>
        </div>

        {/* Content manager — listings & users */}
        <ContentManager isAdmin={isAdmin} />

        {/* Editorial picks manager */}
        <PicksManager />

        {/* Interactive charts */}
        <ChartSection />

        {/* Middle row */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* By category */}
          <div className="rounded-xl border bg-white p-5 space-y-4">
            <h2 className="font-semibold text-sm text-neutral-800">ประกาศตามประเภท</h2>
            <MiniBar items={byCategory.map((c) => ({ label: c.name, count: c.count }))} max={maxCat} />
          </div>

          {/* By province */}
          <div className="rounded-xl border bg-white p-5 space-y-4">
            <h2 className="font-semibold text-sm text-neutral-800">จังหวัดยอดนิยม</h2>
            <MiniBar items={byProvince.map((p) => ({ label: p.name, count: p.count }))} max={maxProv} />
          </div>

          {/* Top searches */}
          <div className="rounded-xl border bg-white p-5 space-y-4">
            <h2 className="font-semibold text-sm text-neutral-800">คำค้นหายอดนิยม (30 วัน)</h2>
            {topSearches.length === 0 ? (
              <p className="text-xs text-neutral-400">ยังไม่มีข้อมูล (ต้องรัน migration 0008 ก่อน)</p>
            ) : (
              <MiniBar items={topSearches.map((s) => ({ label: s.query, count: s.count }))} max={maxSearch} />
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Top viewed listings */}
          <div className="rounded-xl border bg-white p-5 space-y-3">
            <h2 className="font-semibold text-sm text-neutral-800">ประกาศที่ดูมากสุด</h2>
            <div className="divide-y text-sm">
              {topListings.map((l, i) => (
                <div key={l.id} className="flex items-center gap-3 py-2">
                  <span className="w-5 text-xs text-neutral-400 font-medium">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/property/${l.slug}`} className="truncate block hover:text-orange-600 text-xs font-medium">
                      {l.title}
                    </Link>
                    <span className="text-xs text-neutral-400">{(l.categories as unknown as { name_th: string } | null)?.name_th}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-neutral-500 shrink-0">
                    <Eye className="h-3 w-3" />
                    {(l.view_count ?? 0).toLocaleString("th-TH")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recently sold */}
          <div className="rounded-xl border bg-white p-5 space-y-3">
            <h2 className="font-semibold text-sm text-neutral-800">ขายแล้วล่าสุด</h2>
            <div className="divide-y text-sm">
              {recentSold.length === 0 ? (
                <p className="text-xs text-neutral-400 py-2">ยังไม่มีประกาศที่ขายแล้ว</p>
              ) : recentSold.map((l) => (
                <div key={l.id} className="flex items-center gap-3 py-2">
                  <div className="flex-1 min-w-0">
                    <Link href={`/property/${l.slug}`} className="truncate block hover:text-orange-600 text-xs font-medium">
                      {l.title}
                    </Link>
                    <span className="text-xs text-neutral-400">
                      {(l.categories as unknown as { name_th: string } | null)?.name_th} •{" "}
                      {(l.provinces as unknown as { name_th: string } | null)?.name_th}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400 shrink-0">
                    {new Date(l.updated_at).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </>)}
        </>}
      </div>
    </>
  );
}
