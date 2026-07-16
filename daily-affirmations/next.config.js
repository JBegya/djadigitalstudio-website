/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server Actions / API routes need Node runtime (fs, child_process for ffmpeg) — never export static.
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), '@ffmpeg-installer/ffmpeg', '@ffprobe-installer/ffprobe'];
    return config;
  },
};

module.exports = nextConfig;
