import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Navbar } from "@/components/shared/navbar";
import { HomeFooter } from "@/components/home/home-footer";
import { SystemAnnouncementBar } from "@/components/system-announcement-bar";
import { CookieConsent } from "@/components/cookie-consent";
import { OAuthCodeHandler } from "@/components/shared/oauth-code-handler";
import { Analytics } from "@vercel/analytics/react";
import { createAdminClient } from "@/lib/supabase/admin";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.xn--72ch7bybxexd0cc.com";

export async function generateMetadata(): Promise<Metadata> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data } = await admin.from("site_settings").select("value").eq("key", "favicon_url").single();
  const faviconUrl: string | undefined = data?.value ?? undefined;

  return {
    title: "เซ้งร้าน.com — ซื้อ ขาย เซ้งร้าน ทำเลดี",
    description: "ตลาดซื้อขายเซ้งร้านค้าและพื้นที่เชิงพาณิชย์ออนไลน์",
    metadataBase: new URL(BASE_URL),
    openGraph: {
      siteName: "เซ้งร้าน.com",
      locale: "th_TH",
      type: "website",
    },
    ...(faviconUrl && {
      icons: {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl,
      },
    }),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${sarabun.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Suspense><OAuthCodeHandler /></Suspense>
        <Navbar />
        <SystemAnnouncementBar />
        <div className="flex-1">{children}</div>
        <HomeFooter />
        <CookieConsent />
        <Analytics />
      </body>
    </html>
  );
}
