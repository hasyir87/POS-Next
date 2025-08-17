
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
  experimental: {
    // This is needed to allow the Next.js dev server to work correctly in the cloud workspace.
    allowedDevOrigins: ["*.cluster-nzwlpk54dvagsxetkvxzbvslyi.cloudworkstations.dev", "*.cloudworkstations.dev"],
  },
};

export default nextConfig;
