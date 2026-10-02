import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://tiagocosmai.github.io http://localhost:5173 http://127.0.0.1:5173",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
