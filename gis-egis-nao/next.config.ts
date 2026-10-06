import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  transpilePackages: [
    '@nextgis/ngw-leaflet',
    '@nextgis/leaflet-map-adapter',
    '@nextgis/ngw-map',
  ],

  turbopack: {
    resolveAlias: {
      '@nextgis/leaflet-map-adapter/src/style':
        '@nextgis/leaflet-map-adapter/lib/leaflet-map-adapter.css',
    },
  },
};

export default nextConfig;