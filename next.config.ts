import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow leaflet CSS to be imported
  transpilePackages: ['leaflet', 'react-leaflet'],
};

export default nextConfig;
