import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // kvCORE feed photos are max 1024px wide — cap sizes to avoid upscaling blur
    deviceSizes: [320, 420, 640, 768, 1024],
    imageSizes: [64, 128, 256, 384, 512],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.cloudfront.net",
      },
    ],
  },
};

export default nextConfig;
