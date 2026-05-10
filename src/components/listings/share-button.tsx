"use client";

import { useState } from "react";
import { Share2, Copy, Check, X } from "lucide-react";

interface ShareButtonProps {
  title: string;
  url: string;
}

const SOCIALS = [
  {
    label: "Facebook",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: "bg-[#1877F2] hover:bg-[#166fe5]",
    href: (url: string, title: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`,
  },
  {
    label: "LINE",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.952 11.469c0-4.31-4.32-7.816-9.63-7.816-5.31 0-9.63 3.506-9.63 7.816 0 3.866 3.428 7.101 8.057 7.716.314.068.741.207.849.475.097.244.063.626.031.873l-.137.825c-.042.244-.193.954.836.52 1.029-.433 5.555-3.271 7.579-5.601 1.398-1.534 2.045-3.093 2.045-4.808z" />
      </svg>
    ),
    color: "bg-[#06C755] hover:bg-[#05b34c]",
    href: (url: string, title: string) =>
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    label: "X",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: "bg-neutral-900 hover:bg-neutral-700",
    href: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
];

export function ShareButton({ title, url }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled — do nothing
      }
      return;
    }
    setOpen(true);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
      >
        <Share2 className="h-4 w-4" />
        แชร์
      </button>

      {/* Dropdown (desktop fallback) */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border bg-white shadow-lg p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-500">แชร์ไปที่</span>
              <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href(url, title)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white transition-colors ${s.color}`}
              >
                {s.icon}
                {s.label}
              </a>
            ))}

            <button
              onClick={copyLink}
              className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "คัดลอกแล้ว!" : "คัดลอกลิงก์"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
