import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

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

  async rewrites() {
    return [
      {
        source: "/ngw-proxy/:path*",
        destination: "https://gisnao.adm-nao.ru/ngw/:path*",
      },
    ];
  },
};

export default nextConfig;