"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp } from "lucide-react";

type DataPoint = { date: string; count: number };

const DAY_OPTIONS = [7, 15, 30, 60, 90] as const;
type Days = (typeof DAY_OPTIONS)[number];

function shouldShowLabel(i: number, total: number): boolean {
  if (total <= 15) return true;
  if (total <= 31) return i === 0 || i % 7 === 0 || i === total - 1;
  return i === 0 || i % 10 === 0 || i === total - 1;
}

export function PageViewsChart({ initialData, initialDays = 30 }: { initialData: DataPoint[]; initialDays?: Days }) {
  const [days, setDays] = useState<Days>(initialDays);
  const [data, setData] = useState<DataPoint[]>(initialData);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (d: Days) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pageviews?days=${d}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (days !== initialDays) fetchData(days);
  }, [days, initialDays, fetchData]);

  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="rounded-xl border bg-white p-5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-teal-500" />
          คนเข้าเว็บ
        </h2>
        <div className="flex items-center gap-1">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              disabled={loading}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                days === d
                  ? "bg-teal-500 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {d}ว.
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-36 flex items-center justify-center">
          <div className="h-5 w-5 rounded-full border-2 border-teal-300 border-t-teal-500 animate-spin" />
        </div>
      ) : (
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
                  {d.count > 0 && (
                    <>
                      <div className="text-center text-[8px] font-semibold text-teal-700 mb-0.5 leading-none">
                        {d.count}
                      </div>
                      <div
                        className="w-full rounded-t-sm bg-teal-400 hover:bg-teal-500 transition-colors"
                        style={{ height: `${pct}%` }}
                      />
                    </>
                  )}
                  {d.count === 0 && <div className="w-full bg-neutral-100" style={{ height: "2px" }} />}
                </div>
              );
            })}
          </div>

          {/* x-axis labels */}
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

          <p className="text-xs text-neutral-400 text-right">
            รวม {total.toLocaleString("th-TH")} ครั้ง ใน {days} วัน
          </p>
        </>
      )}
    </div>
  );
}
