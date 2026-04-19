"use client";

import { useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Menu, X, ChevronDown, LogOut, User as UserIcon, FileText, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/lib/actions/auth";

interface NavbarClientProps {
  user: User | null;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    wallet_balance: number;
  } | null;
}

export function NavbarClient({ user, profile }: NavbarClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = profile?.display_name ?? user?.email ?? "ผู้ใช้";
  const initials = displayName.charAt(0).toUpperCase();
  const walletBalance = (profile?.wallet_balance ?? 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <>
      {/* Desktop right side */}
      <nav className="hidden md:flex items-center gap-3">
        {user ? (
          <>
            <Link href="/listings/new">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                + ลงประกาศ
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-neutral-400">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName} />
                    <AvatarFallback className="bg-orange-100 text-orange-700 text-sm font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-neutral-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    โปรไฟล์
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my-listings" className="cursor-pointer">
                    <FileText className="mr-2 h-4 w-4" />
                    ประกาศของฉัน
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/wallet" className="cursor-pointer">
                    <Wallet className="mr-2 h-4 w-4" />
                    เติมเงิน ฿{walletBalance}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={logoutAction}>
                    <button type="submit" className="flex w-full items-center text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      ออกจากระบบ
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                เข้าสู่ระบบ
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                สมัครสมาชิก
              </Button>
            </Link>
          </>
        )}
      </nav>

      {/* Mobile hamburger */}
      <button
        className="md:hidden p-2 rounded-md text-neutral-600"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="เปิด/ปิดเมนู"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="absolute left-0 top-14 w-full bg-white border-b shadow-lg md:hidden z-50">
          <div className="flex flex-col p-4 gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-3 pb-3 border-b">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-orange-100 text-orange-700">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{displayName}</p>
                    <p className="text-xs text-neutral-500">{user.email}</p>
                  </div>
                </div>
                <Link href="/listings/new" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    + ลงประกาศ
                  </Button>
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 py-2 text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  <UserIcon className="h-4 w-4" /> โปรไฟล์
                </Link>
                <Link
                  href="/my-listings"
                  className="flex items-center gap-2 py-2 text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  <FileText className="h-4 w-4" /> ประกาศของฉัน
                </Link>
                <Link
                  href="/wallet"
                  className="flex items-center gap-2 py-2 text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  <Wallet className="h-4 w-4" /> เติมเงิน ฿{walletBalance}
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex items-center gap-2 py-2 text-sm text-red-600 w-full"
                  >
                    <LogOut className="h-4 w-4" /> ออกจากระบบ
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full">
                    เข้าสู่ระบบ
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    สมัครสมาชิก
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
