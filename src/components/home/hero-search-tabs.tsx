"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Wallet } from "lucide-react";
import { SearchBox } from "@/components/listings/search-box";
import { FilterSheet } from "@/components/home/filter-sheet";

interface Props {
  categories: { id: number; name_th: string; slug: string }[];
  provinces: { id: number; name_th: string; slug: string }[];
}

type Mode = "keyword" | "budget";
type BudgetType = "sale" | "rent";

const QUICK_SALE = [100_000, 300_000, 500_000, 1_000_000];
const QUICK_RENT = [10_000, 20_000, 30_000, 50_000];

function formatThousands(n: number) {
  return n.toLocaleString("en-US");
}
function unformat(s: string) {
  return s.replace(/[^0-9]/g, "");
}

export function HeroSearchTabs({ categories, provinces }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("keyword");
  const [budgetType, setBudgetType] = useState<BudgetType>("sale");
  const [budget, setBudget] = useState("");

  const submitBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = unformat(budget);
    const qs = new URLSearchParams();
    qs.set("type", budgetType);
    if (raw) qs.set("max_price", raw);
    router.push(`/listings?${qs.toString()}`);
  };

  const quick = budgetType === "sale" ? QUICK_SALE : QUICK_RENT;

  return (
    <>
      {/* Tabs — above the white card */}
      <div className="inline-flex gap-1 rounded-full bg-white/15 backdrop-blur-sm p-1 ring-1 ring-white/20">
        <button
          type="button"
          onClick={() => setMode("keyword")}
          className={
            mode === "keyword"
              ? "flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-neutral-900 shadow"
              : "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-white hover:bg-white/10"
          }
        >
          <Search className="h-3.5 w-3.5" />
          ค้นด้วยคำ
        </button>
        <button
          type="button"
          onClick={() => setMode("budget")}
          className={
            mode === "budget"
              ? "flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-neutral-900 shadow"
              : "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-white hover:bg-white/10"
          }
        >
          <Wallet className="h-3.5 w-3.5" />
          ค้นตามงบ
        </button>
      </div>

      {/* White card — content swaps by mode */}
      <div className="mx-auto mt-3 w-full max-w-xl rounded-2xl bg-white/95 p-2 shadow-xl ring-1 ring-black/5 backdrop-blur">
        {mode === "keyword" ? (
          <div className="flex items-stretch gap-2">
            <div className="min-w-0 flex-1">
              <SearchBox targetPath="/listings" />
            </div>
            <FilterSheet categories={categories} provinces={provinces} />
          </div>
        ) : (
          <form onSubmit={submitBudget} className="space-y-2">
            <div className="flex items-stretch gap-2">
              {/* Toggle */}
              <div className="flex shrink-0 rounded-xl bg-neutral-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setBudgetType("sale")}
                  className={
                    budgetType === "sale"
                      ? "rounded-lg bg-white px-3 py-1.5 font-semibold text-neutral-900 shadow"
                      : "rounded-lg px-3 py-1.5 font-medium text-neutral-500"
                  }
                >
                  เซ้ง
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetType("rent")}
                  className={
                    budgetType === "rent"
                      ? "rounded-lg bg-white px-3 py-1.5 font-semibold text-neutral-900 shadow"
                      : "rounded-lg px-3 py-1.5 font-medium text-neutral-500"
                  }
                >
                  เช่า/เดือน
                </button>
              </div>

              {/* Input */}
              <div className="relative min-w-0 flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">฿</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value.replace(/[^\d,]/g, ""))}
                  onBlur={(e) => {
                    const n = Number(unformat(e.target.value));
                    setBudget(n > 0 ? formatThousands(n) : "");
                  }}
                  placeholder={budgetType === "sale" ? "เช่น 500,000" : "เช่น 30,000"}
                  className="w-full rounded-xl border border-neutral-300 bg-white py-3 pl-7 pr-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
              >
                หาร้าน
              </button>
            </div>

            {/* Quick picks */}
            <div className="flex flex-wrap items-center gap-1.5 px-1">
              <span className="text-[11px] text-neutral-400">เลือกเร็ว:</span>
              {quick.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setBudget(formatThousands(v))}
                  className="rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-[11px] text-neutral-700 hover:border-orange-400 hover:text-orange-600"
                >
                  ฿{v >= 1_000_000 ? `${v / 1_000_000}M` : `${v / 1000}k`}
                </button>
              ))}
            </div>
          </form>
        )}
      </div>
    </>
  );
}
