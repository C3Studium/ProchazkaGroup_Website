import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'prochazkagroup.cz',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.prochazkagroup.cz',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pg-website-nbzo0pdil-centrumprojects.vercel.app',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'syjlnusygybtuzoxirnw.supabase.co',
        pathname: '/**',
      }
    ],
    // Add configured qualities to fix warnings
    qualities: [60, 80, 90, 100],
    // Improve image optimization settings
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Add output: 'standalone' for better Vercel deployment
  output: 'standalone',
};

export default nextConfig;