import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  skipTrailingSlashRedirect: true,
  transpilePackages: [
    "@nextgis/ngw-leaflet",
    "@nextgis/leaflet-map-adapter",
    "@nextgis/ngw-map",
  ],

  turbopack: {
    resolveAlias: {
      "@nextgis/leaflet-map-adapter/src/style":
        "@nextgis/leaflet-map-adapter/lib/leaflet-map-adapter.css",
    },
  },

  env: {
    NEXT_PUBLIC_NGW_BASE_URL:
      process.env.NEXT_PUBLIC_NGW_BASE_URL || "/ngw-proxy",
  },
};

export default nextConfig;