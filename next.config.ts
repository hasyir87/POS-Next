/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      }
    ],
  },
  async rewrites() {
    const functionUrl = `https://${process.env.NEXT_PUBLIC_FIREBASE_REGION}-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net`;
    return [
      {
        source: '/api/functions/:path*',
        destination: `${functionUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
