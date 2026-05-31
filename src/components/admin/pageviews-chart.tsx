"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TrendingUp, Calendar } from "lucide-react";

type DataPoint = { date: string; count: number };
type Mode = "preset" | "custom";

const DAY_OPTIONS = [7, 15, 30, 60, 90] as const;
type Days = (typeof DAY_OPTIONS)[number];

const toLocalDateStr = (d: Date) => d.toISOString().slice(0, 10);

function today() { return toLocalDateStr(new Date()); }
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return toLocalDateStr(d);
}

function shouldShowLabel(i: number, total: number): boolean {
  if (total <= 15) return true;
  if (total <= 31) return i === 0 || i % 7 === 0 || i === total - 1;
  return i === 0 || i % 10 === 0 || i === total - 1;
}

function BarChart({ data }: { data: DataPoint[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <>
      <div className="flex items-end gap-px h-36">
        {data.map((d, i) => {
          const pct = d.count === 0 ? 0 : Math.max((d.count / max) * 100, 6);
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col justify-end h-full"
              title={`${new Date(d.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}: ${d.count} คน`}
            >
              {d.count > 0 ? (
                <>
                  <div className="text-center text-[8px] font-semibold text-teal-700 mb-0.5 leading-none">{d.count}</div>
                  <div className="w-full rounded-t-sm bg-teal-400 hover:bg-teal-500 transition-colors" style={{ height: `${pct}%` }} />
                </>
              ) : (
                <div className="w-full bg-neutral-100" style={{ height: "2px" }} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-px">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {shouldShowLabel(i, data.length) && (
              <span className="text-[9px] text-neutral-400 leading-none">
                {new Date(d.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export function PageViewsChart({ initialData, initialDays = 30 }: { initialData: DataPoint[]; initialDays?: Days }) {
  const [mode, setMode] = useState<Mode>("preset");
  const [days, setDays] = useState<Days>(initialDays);
  const [fromDate, setFromDate] = useState(daysAgo(30));
  const [toDate, setToDate] = useState(today());
  const [data, setData] = useState<DataPoint[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const customRef = useRef<HTMLDivElement>(null);

  const fetchPreset = useCallback(async (d: Days) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pageviews?days=${d}`);
      setData(await res.json());
    } finally { setLoading(false); }
  }, []);

  const fetchCustom = useCallback(async (from: string, to: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pageviews?from=${from}&to=${to}`);
      setData(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (days !== initialDays) fetchPreset(days);
  }, [days, initialDays, fetchPreset]);

  // close custom panel on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (customRef.current && !customRef.current.contains(e.target as Node)) {
        setShowCustom(false);
      }
    }
    if (showCustom) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showCustom]);

  const applyCustom = () => {
    if (!fromDate || !toDate || fromDate > toDate) return;
    setMode("custom");
    setShowCustom(false);
    fetchCustom(fromDate, toDate);
  };

  const handlePreset = (d: Days) => {
    setMode("preset");
    setDays(d);
    setShowCustom(false);
  };

  const total = data.reduce((s, d) => s + d.count, 0);
  const rangeLabel = mode === "custom"
    ? `${new Date(fromDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })} – ${new Date(toDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`
    : `${days} วัน`;

  return (
    <div className="rounded-xl border bg-white p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-teal-500" />
          คนเข้าเว็บ
        </h2>

        <div className="flex items-center gap-1 flex-wrap">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => handlePreset(d)}
              disabled={loading}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                mode === "preset" && days === d
                  ? "bg-teal-500 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {d}ว.
            </button>
          ))}

          {/* Custom range button */}
          <div className="relative" ref={customRef}>
            <button
              onClick={() => setShowCustom((v) => !v)}
              disabled={loading}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                mode === "custom"
                  ? "bg-teal-500 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <Calendar className="h-3 w-3" />
              {mode === "custom" ? rangeLabel : "กำหนดเอง"}
            </button>

            {showCustom && (
              <div className="absolute right-0 top-8 z-20 rounded-xl border bg-white shadow-lg p-4 space-y-3 w-64">
                <p className="text-xs font-semibold text-neutral-700">เลือกช่วงวันที่</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-neutral-500">จากวันที่</label>
                    <input
                      type="date"
                      value={fromDate}
                      max={toDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500">ถึงวันที่</label>
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate}
                      max={today()}
                      onChange={(e) => setToDate(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                </div>
                <button
                  onClick={applyCustom}
                  disabled={!fromDate || !toDate || fromDate > toDate}
                  className="w-full rounded-lg bg-teal-500 py-1.5 text-xs font-semibold text-white hover:bg-teal-600 disabled:opacity-40 transition-colors"
                >
                  ดูข้อมูล
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-36 flex items-center justify-center">
          <div className="h-5 w-5 rounded-full border-2 border-teal-300 border-t-teal-500 animate-spin" />
        </div>
      ) : (
        <BarChart data={data} />
      )}

      <p className="text-xs text-neutral-400 text-right">
        รวม {total.toLocaleString("th-TH")} ครั้ง ({rangeLabel})
      </p>
    </div>
  );
}
