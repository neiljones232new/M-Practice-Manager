/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    // Let Next expose this to the browser; your .env.local sets it
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  },
  typescript: { ignoreBuildErrors: false },
};

module.exports = nextConfig;
