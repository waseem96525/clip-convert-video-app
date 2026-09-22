import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    MAX_UPLOAD_SIZE: process.env.MAX_UPLOAD_SIZE,
    MAX_VIDEO_DURATION: process.env.MAX_VIDEO_DURATION,
    MAX_CLIP_DURATION: process.env.MAX_CLIP_DURATION,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

export default nextConfig;
