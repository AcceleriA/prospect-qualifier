import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://www.acceleria.co https://acceleria.co",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
