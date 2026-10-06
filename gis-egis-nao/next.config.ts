/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@nextgis/ngw-leaflet',
    '@nextgis/leaflet-map-adapter',
    '@nextgis/ngw-map',
    // add other @nextgis/* packages you use
  ],
  turbopack: {
    resolveAlias: {
      // map the broken path to the real CSS (or an empty module)
      '@nextgis/leaflet-map-adapter/src/style':
        '@nextgis/leaflet-map-adapter/lib/leaflet-map-adapter.css',
    },
  },
  // if you still use webpack (e.g. `next build` without turbopack):
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@nextgis/leaflet-map-adapter/src/style':
        require.resolve(
          '@nextgis/leaflet-map-adapter/lib/leaflet-map-adapter.css'
        ),
    };
    return config;
  },
};

export default nextConfig;