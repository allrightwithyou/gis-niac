import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopack: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactCompiler: true,
};

export default nextConfig;
