import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "d36xftgacqn2p.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "d3ndfxyzvdc7if.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "d8wkmujfu2w4l.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "d2td4dobkk213c.cloudfront.net",
      },
    ],
  },
};

export default nextConfig;
