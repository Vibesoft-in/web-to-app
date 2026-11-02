/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: 'http://localhost:8000/admin',
        permanent: false,
      },
      {
        source: '/admin/:path*',
        destination: 'http://localhost:8000/admin/:path*',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/storage/:path*',
        destination: 'http://127.0.0.1:8000/storage/:path*',
      },
    ];
  },
};

export default nextConfig;
