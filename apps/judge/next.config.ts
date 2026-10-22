import type { NextConfig } from "next"

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8080"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${GATEWAY_URL}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
