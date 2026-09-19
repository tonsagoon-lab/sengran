"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function shouldShowLabel(i: number, total: number): boolean {
  if (total <= 8) return true;
  if (total <= 15) return i % 2 === 0 || i === total - 1;
  if (total <= 31) return i === 0 || i % 7 === 0 || i === total - 1;
  return i === 0 || i % 10 === 0 || i === total - 1;
}

// Build a smooth Catmull-Rom-ish path (using simple monotonic interpolation)
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function AreaChart({ data }: { data: DataPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    if (!svgRef.current) return;
    const el = svgRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(Math.max(200, e.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = 180;
  const padTop = 16;
  const padBottom = 24;
  const padX = 8;
  const innerH = height - padTop - padBottom;
  const innerW = width - padX * 2;

  const { points, max, avg } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.count), 1);
    const avg = data.length > 0 ? data.reduce((s, d) => s + d.count, 0) / data.length : 0;
    const n = data.length;
    const points = data.map((d, i) => {
      const x = padX + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const y = padTop + innerH - (d.count / max) * innerH;
      return { x, y };
    });
    return { points, max, avg };
  }, [data, innerW, innerH, padX, padTop]);

  if (data.length === 0) {
    return <div className="h-[180px] flex items-center justify-center text-xs text-neutral-400">ยังไม่มีข้อมูล</div>;
  }

  const linePath = buildSmoothPath(points);
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${padTop + innerH} L ${points[0].x} ${padTop + innerH} Z`
    : "";

  const avgY = padTop + innerH - (avg / max) * innerH;

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    let closest = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < minDist) { minDist = d; closest = i; }
    });
    setHover(closest);
  };

  const hoverPoint = hover !== null ? points[hover] : null;
  const hoverData = hover !== null ? data[hover] : null;

  // Y-axis grid lines
  const gridCount = 3;
  const gridLines = Array.from({ length: gridCount }, (_, i) => {
    const ratio = (i + 1) / (gridCount + 1);
    return {
      y: padTop + innerH - ratio * innerH,
      value: Math.round(max * ratio),
    };
  });

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        className="overflow-visible"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="pvGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padX}
              x2={width - padX}
              y1={g.y}
              y2={g.y}
              stroke="#e5e7eb"
              strokeDasharray="2 3"
              strokeWidth={1}
            />
            <text
              x={padX}
              y={g.y - 2}
              className="fill-neutral-400"
              style={{ fontSize: 9 }}
            >
              {g.value.toLocaleString("th-TH")}
            </text>
          </g>
        ))}

        {/* Average line */}
        {avg > 0 && (
          <g>
            <line
              x1={padX}
              x2={width - padX}
              y1={avgY}
              y2={avgY}
              stroke="#f97316"
              strokeDasharray="4 3"
              strokeWidth={1.2}
              opacity={0.7}
            />
            <text
              x={width - padX}
              y={avgY - 3}
              textAnchor="end"
              className="fill-orange-500"
              style={{ fontSize: 9, fontWeight: 600 }}
            >
              เฉลี่ย {Math.round(avg).toLocaleString("th-TH")}
            </text>
          </g>
        )}

        {/* Area fill */}
        <path d={areaPath} fill="url(#pvGradient)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#14b8a6"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Peak / hover markers */}
        {points.map((p, i) => {
          const isPeak = data[i].count === max && max > 0;
          const isHover = hover === i;
          if (!isPeak && !isHover) return null;
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isHover ? 5 : 4}
                fill="white"
                stroke="#14b8a6"
                strokeWidth={2}
              />
              {isPeak && !isHover && (
                <text
                  x={p.x}
                  y={p.y - 8}
                  textAnchor="middle"
                  className="fill-teal-700"
                  style={{ fontSize: 10, fontWeight: 700 }}
                >
                  {data[i].count.toLocaleString("th-TH")}
                </text>
              )}
            </g>
          );
        })}

        {/* Hover crosshair */}
        {hoverPoint && (
          <line
            x1={hoverPoint.x}
            x2={hoverPoint.x}
            y1={padTop}
            y2={padTop + innerH}
            stroke="#14b8a6"
            strokeDasharray="2 2"
            strokeWidth={1}
            opacity={0.5}
          />
        )}
      </svg>

      {/* Hover tooltip */}
      {hoverPoint && hoverData && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-neutral-900 px-2.5 py-1.5 text-white shadow-lg"
          style={{
            left: `${(hoverPoint.x / width) * 100}%`,
            top: 0,
            transform: `translate(-50%, -8px) translateY(-100%)`,
            whiteSpace: "nowrap",
          }}
        >
          <div className="text-[10px] text-neutral-300 leading-none">
            {formatShortDate(hoverData.date)}
          </div>
          <div className="text-xs font-semibold leading-tight mt-0.5">
            {hoverData.count.toLocaleString("th-TH")} คน
          </div>
        </div>
      )}

      {/* X-axis labels */}
      <div className="flex gap-px mt-1 px-2">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {shouldShowLabel(i, data.length) && (
              <span className="text-[9px] text-neutral-400 leading-none whitespace-nowrap">
                {formatShortDate(d.date)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
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
  const peak = Math.max(...data.map((d) => d.count), 0);
  const avg = data.length > 0 ? Math.round(total / data.length) : 0;
  const rangeLabel = mode === "custom"
    ? `${formatShortDate(fromDate)} – ${formatShortDate(toDate)}`
    : `${days} วันล่าสุด`;

  return (
    <div className="rounded-xl border bg-white p-5 space-y-4">
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

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-neutral-50 p-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">รวม</p>
          <p className="text-base font-bold text-neutral-900 leading-tight">
            {total.toLocaleString("th-TH")}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">สูงสุด/วัน</p>
          <p className="text-base font-bold text-teal-600 leading-tight">
            {peak.toLocaleString("th-TH")}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">เฉลี่ย/วัน</p>
          <p className="text-base font-bold text-orange-500 leading-tight">
            {avg.toLocaleString("th-TH")}
          </p>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-[180px] flex items-center justify-center">
          <div className="h-5 w-5 rounded-full border-2 border-teal-300 border-t-teal-500 animate-spin" />
        </div>
      ) : (
        <AreaChart data={data} />
      )}

      <p className="text-[11px] text-neutral-400 text-right">{rangeLabel}</p>
    </div>
  );
}
