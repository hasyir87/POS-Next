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
      },
    ],
  },
  async rewrites() {
    // Pastikan variabel lingkungan ini sudah di-set di environment Anda
    const region = process.env.NEXT_PUBLIC_FIREBASE_REGION || 'us-central1';
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!projectId) {
      console.error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set. Rewrites for Cloud Functions will not work.");
      return [];
    }

    const functionUrl = `https://${region}-${projectId}.cloudfunctions.net`;

    return [
      {
        source: '/api/functions/:path*',
        destination: `${functionUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
