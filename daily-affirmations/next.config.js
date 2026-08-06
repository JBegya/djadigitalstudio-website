/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API routes need Node runtime (fs) — never export static.
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
