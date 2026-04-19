"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

interface SearchBoxProps {
  defaultValue?: string;
}

export function SearchBox({ defaultValue = "" }: SearchBoxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback(
    (q: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (q.trim()) next.set("q", q.trim());
      else next.delete("q");
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(e.target.value), 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    push(value);
  };

  return (
    <form onSubmit={handleSubmit} className="relative mx-auto w-full max-w-xl">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="ค้นหาร้าน..."
        className="w-full rounded-xl border border-neutral-300 bg-white py-3 pl-4 pr-12 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
      />
      <button
        type="submit"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-orange-500"
        aria-label="ค้นหา"
      >
        <Search className="h-5 w-5" />
      </button>
    </form>
  );
}
