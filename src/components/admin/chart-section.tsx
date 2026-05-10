"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Users } from "lucide-react";

type DataPoint = { date: string; count: number };

const PERIODS = [
  { key: "7d", label: "7 วัน" },
  { key: "30d", label: "30 วัน" },
  { key: "3m", label: "3 เดือน" },
  { key: "12m", label: "12 เดือน" },
  { key: "ytd", label: "ปีนี้" },
] as const;

type Period = (typeof PERIODS)[number]["key"];

const BAR_HEIGHT = 100;

function formatLabel(date: string, groupBy: "day" | "month"): string {
  if (groupBy === "month") {
    const [y, m] = date.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("th-TH", { month: "short", year: "2-digit" });
  }
  return new Date(date).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function shouldShowLabel(i: number, total: number): boolean {
  if (total <= 7) return true;
  if (total <= 12) return true; // months
  if (total <= 31) return i === 0 || i % 7 === 0 || i === total - 1;
  return i === 0 || i % 5 === 0 || i === total - 1;
}

function BarChart({ data, groupBy, barColor, labelColor }: {
  data: DataPoint[];
  groupBy: "day" | "month";
  barColor: string;
  labelColor: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.length;

  return (
    <div className="space-y-2">
      {/* bars */}
      <div className="flex items-end gap-0.5" style={{ height: BAR_HEIGHT + 20 }}>
        {data.map((d, i) => {
          const h = Math.max(Math.round((d.count / max) * BAR_HEIGHT), d.count > 0 ? 4 : 2);
          return (
            <div
              key={d.date}
              className="relative flex-1 flex flex-col justify-end"
              style={{ height: BAR_HEIGHT + 20 }}
            >
              {/* count label above bar */}
              <span
                className={`absolute w-full text-center text-[9px] font-semibold leading-none ${d.count > 0 ? labelColor : "text-transparent"}`}
                style={{ bottom: h + 3 }}
              >
                {d.count > 0 ? d.count : ""}
              </span>
              <div
                className={`w-full rounded-sm ${barColor} opacity-90 hover:opacity-100 transition-opacity cursor-default`}
                style={{ height: h }}
              />
            </div>
          );
        })}
      </div>
      {/* x-axis labels */}
      <div className="flex gap-0.5">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {shouldShowLabel(i, total) && (
              <span className="text-[9px] text-neutral-400 leading-none">
                {formatLabel(d.date, groupBy)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSection() {
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<"day" | "month">("day");
  const [listings, setListings] = useState<DataPoint[]>([]);
  const [users, setUsers] = useState<DataPoint[]>([]);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/chart?period=${p}`);
      const json = await res.json();
      setGroupBy(json.groupBy);
      setListings(json.listings);
      setUsers(json.users);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(period); }, [period, fetchData]);

  const handlePeriod = (p: Period) => {
    setPeriod(p);
  };

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-neutral-500 font-medium">ช่วงเวลา:</span>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePeriod(p.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              period === p.key
                ? "bg-orange-500 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Listings chart */}
        <div className="rounded-xl border bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <h2 className="font-semibold text-sm text-neutral-800">ประกาศใหม่</h2>
            </div>
            {!loading && (
              <span className="text-xs text-neutral-400">
                รวม {listings.reduce((s, d) => s + d.count, 0).toLocaleString("th-TH")} ประกาศ
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full border-2 border-orange-300 border-t-orange-500 animate-spin" />
            </div>
          ) : (
            <BarChart data={listings} groupBy={groupBy} barColor="bg-orange-400" labelColor="text-orange-500" />
          )}
        </div>

        {/* Users chart */}
        <div className="rounded-xl border bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <h2 className="font-semibold text-sm text-neutral-800">ผู้ใช้ใหม่</h2>
            </div>
            {!loading && (
              <span className="text-xs text-neutral-400">
                รวม {users.reduce((s, d) => s + d.count, 0).toLocaleString("th-TH")} คน
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full border-2 border-purple-300 border-t-purple-500 animate-spin" />
            </div>
          ) : (
            <BarChart data={users} groupBy={groupBy} barColor="bg-purple-400" labelColor="text-purple-500" />
          )}
        </div>
      </div>
    </div>
  );
}
