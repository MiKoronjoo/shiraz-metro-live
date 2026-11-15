import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/shiraz-metro-live",
  assetPrefix: "/shiraz-metro-live/",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
