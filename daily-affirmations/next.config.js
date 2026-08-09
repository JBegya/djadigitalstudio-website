/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API routes need Node runtime (fs) — never export static.
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {
    // These installer packages resolve their platform binary via a dynamic require() at runtime.
    // Webpack can't statically analyze that, so it bundles the *entire* package directory as a
    // "sync require" context — including README.md/tsconfig.json — and fails to parse them as JS.
    // Excluding them from the server bundle makes Next require() them natively from node_modules.
    serverComponentsExternalPackages: ['@ffmpeg-installer/ffmpeg', '@ffprobe-installer/ffprobe'],
  },
};

module.exports = nextConfig;
