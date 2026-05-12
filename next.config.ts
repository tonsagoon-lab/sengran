import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fexxmtjmrlpitzsjrgbd.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "sale4biz.com",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "xn--72ch7bybxexd0cc.com",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "pub-09bb561cab274ac2b89ed5f36101dec0.r2.dev",
      },
    ],
  },
};

export default nextConfig;
