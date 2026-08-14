/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'unavatar.io',
      },
    ],
  },
  // NOTE: If you change NEXT_PUBLIC_API_URL to a relative path (e.g. '/api'),
  // uncomment the rewrites below and update api.ts to use relative URLs.
  // async rewrites() {
  //   const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: `${apiUrl}/:path*`,
  //     },
  //   ];
  // },
};

module.exports = nextConfig;
