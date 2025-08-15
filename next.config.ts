import type {NextConfig} from 'next';
const nextConfig = {
  // ... konfigurasi existing Anda ...
  experimental: {
    allowedDevOrigins: ["localhost", "0.0.0.0"] // Hanya untuk development lokal
  }
}
const nextConfig: NextConfig = {
  /* config options here */
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
};

export default nextConfig;
