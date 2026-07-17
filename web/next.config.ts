import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:3000";

// /api is a proxy-only prefix: stripped and forwarded to the backend's real
// /v1 routes, so browser calls stay same-origin (no CORS anywhere).
const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  transpilePackages: ["abstract-flow"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/:path*` }];
  },
};

export default nextConfig;
