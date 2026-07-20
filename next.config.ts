import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "ais-dev-ro5pjivfo2jak5nph5rpas-375848115708.europe-west2.run.app",
        "ais-pre-ro5pjivfo2jak5nph5rpas-375848115708.europe-west2.run.app"
      ]
    }
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;